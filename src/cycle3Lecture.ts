// La lecture au cours moyen : lire avec fluidité, lire à voix haute avec
// expressivité, comprendre seul des textes, lire des documents pour apprendre,
// lire une œuvre et se l'approprier.
//
// Bâties, en le disant, sur le programme de français du cycle 3 (2025) et ses
// exemples de réussite du CM1 et du CM2 : les livrets d'accompagnement de
// français s'arrêtent au CE2. Le programme veut que l'élève lise chaque
// jour, pratique la lecture silencieuse, s'entraîne chaque semaine à la
// lecture à voix haute et exerce sa compréhension ; qu'il apprenne des
// stratégies de compréhension pour devenir un lecteur autonome ; qu'il lise
// au moins sept œuvres complètes par an et en garde trace. Les feuilles
// viennent de « Comprendre un texte » (textes du cours moyen), de
// lectureCoursMoyen.ts, documentsCoursMoyen.ts et lecteurCoursMoyen.ts.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { PROGRAMME_FRANCAIS_C3 } from "./cycle3Langue";
import { REGLAGES_COMPREHENSION, STYLE_COMPREHENSION, htmlComprehension, type ExerciceComprehension } from "./comprehension";
import { REGLAGES_LECTURE_CM, STYLE_LECTURE_CM, htmlLectureCM, type ExerciceLectureCM } from "./lectureCoursMoyen";
import { REGLAGES_DOCUMENTS_CM, STYLE_DOCUMENTS_CM, htmlDocumentsCM, type ExerciceDocumentsCM } from "./documentsCoursMoyen";
import { REGLAGES_LECTEUR_CM, STYLE_LECTEUR_CM, htmlLecteurCM, type ExerciceLecteurCM } from "./lecteurCoursMoyen";

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
/** Un rendez-vous court qui revient chaque jour ou chaque semaine : l'entraînement du programme. */
const rituel = (titre: string, objectif: string, duree: number, activite: string) => seance(titre, sauront(objectif), duree, [ph(T4, `${duree} min`, activite)]);
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "25 min", `Une feuille : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

// ── Lire avec fluidité ────────────────────────────────────────────────────

const fluence = (classe: "CM1" | "CM2"): Demarche => {
  const cm2 = classe === "CM2", objectif = cm2 ? 120 : 110;
  return {
    id: `fluence-${classe.toLowerCase()}`, nom: `Lire avec fluidité : ${objectif} mots par minute (${classe})`, famille: "Français",
    source: PROGRAMME_FRANCAIS_C3,
    resume: cm2
      ? "Poursuivre l'entraînement à la lecture à voix haute et à la lecture silencieuse ; lire à voix haute, après préparation, un texte long en tenant compte de la ponctuation, des liaisons et des unités syntaxiques ; lire correctement en ciblant 120 mots par minute en moyenne. Exemples de réussite : lire sans erreur, après préparation, un texte long à un rythme régulier, celui de la parole ; un phrasé et une prosodie adaptés au texte. L'entraînement est quotidien : la lecture répétée d'un même texte, en binôme, mesurée sur un texte chronométré."
      : "Lire sans effort un texte d'une page, silencieusement ou à voix haute ; lire à voix haute un texte court, après préparation, sans confondre les graphèmes, même complexes, en tenant compte de la ponctuation ; mémoriser de plus en plus de mots fréquents et irréguliers — « second, monsieur, oignon, œufs, femme, chœur », disent les exemples de réussite — ; lire correctement en ciblant 110 mots par minute en moyenne. L'entraînement est quotidien : la lecture répétée d'un même texte, en binôme, mesurée sur un texte chronométré ; à la prestation, on ne bute plus sur les mots travaillés pendant la préparation.",
    seances: [
      trois("Mesurer sa lecture", "mesurer les mots qu'on lit correctement en une minute, et se fixer un objectif.",
        "Pourquoi lire vite et bien ? Pour comprendre : qui bute perd le fil. L'adulte présente la mesure : les mots correctement lus en une minute.",
        "En binôme, chacun lit le texte chronométré pendant une minute ; l'autre suit, entoure les erreurs et marque l'endroit atteint ; on calcule les mots correctement lus et on les note dans le tableau.",
        `Ce qu'on retient : les mots lus, moins les erreurs ; mon objectif, ${objectif} mots par minute en moyenne à la fin du ${classe}.`,
        "La mesure est un repère, pas une course : le texte est d'abord lu en silence, et la compréhension compte autant que la vitesse."),
      rituel("La lecture répétée (chaque jour)", "lire de plus en plus vite et juste un même texte, en binôme.", 15,
        "Chaque jour, en binôme : je relis le texte de la semaine pendant une minute, mon binôme note ce que j'ai lu ; puis on échange. Le lendemain, on relit le même texte, et l'on voit ses progrès."),
      entrainement(cm2 ? "Les mots et les groupes de mots" : "Les mots irréguliers", cm2 ? "lire sans hésiter les mots difficiles et faire les liaisons." : "lire sans hésiter les mots fréquents et irréguliers.",
        cm2 ? "Lire et relire les mots irréguliers et les mots longs du texte ; marquer les liaisons et les groupes de sens d'un passage, puis le lire d'un souffle."
          : "Lire et relire les mots irréguliers, ligne par ligne puis dans le désordre ; les repérer dans un texte ; compléter la liste de la classe.",
        "Ce qu'on retient : ces mots se lisent d'un coup d'œil, comme on les a appris."),
      trois(cm2 ? "Lire un texte long" : "Lire un texte d'une page sans effort", cm2 ? "préparer et lire un texte long en tenant compte des liaisons et des unités syntaxiques." : "préparer et lire un texte d'une page en tenant compte de la ponctuation.",
        cm2 ? "Un texte long, lu en silence : qu'a-t-on compris ? Où risque-t-on de buter ?" : "Un texte d'une page, lu en silence : qu'a-t-on compris ? Où risque-t-on de buter ?",
        cm2 ? "Repérer les mots difficiles et les relire ; marquer les liaisons et les groupes de sens ; lire à voix haute, paragraphe par paragraphe, en binôme."
          : "Repérer les mots difficiles et les relire ; lire à voix haute en tenant compte de la ponctuation, en binôme.",
        "Ce qu'on retient : je prépare ma lecture — les mots difficiles, la ponctuation, les groupes de sens."),
      evaluation("lire un texte chronométré et compter les mots correctement lus", "Ensuite, la mesure revient chaque mois sur un nouveau texte ; la lecture répétée continue."),
    ],
  };
};

// ── Lire à voix haute avec expressivité ───────────────────────────────────

const voixHaute = (classe: "CM1" | "CM2"): Demarche => {
  const cm2 = classe === "CM2";
  return {
    id: `voix-haute-${classe.toLowerCase()}`, nom: `Lire à voix haute avec expressivité (${classe})`, famille: "Français",
    source: `${PROGRAMME_FRANCAIS_C3} ; les signes du code de la lecture de la classe`,
    resume: cm2
      ? "Lire à voix haute, avec aisance et expressivité, un texte travaillé en amont, en respectant l'articulation du texte ; travailler la mise en voix — l'intonation, les effets — ; faire vivre le texte et prendre plaisir à le lire. Exemples de réussite : une lecture fluide et vivante ; varier les intonations selon les effets du texte ; faire ressortir les mots importants ; s'enregistrer et s'écouter pour améliorer sa lecture."
      : "Lire à voix haute, avec aisance et expressivité, un texte court travaillé en amont ; un rythme fluide et régulier qui respecte la ponctuation et les groupes de sens, pour que l'auditoire comprenne ; gérer le volume et le débit de sa voix. Exemples de réussite : marquer par l'intonation les points d'exclamation et d'interrogation, les pauses et les liaisons ; faire entendre le récit et le dialogue.",
    seances: [
      trois("Ce qui fait une bonne lecture", "dire ce qui rend une lecture à voix haute compréhensible et vivante.",
        "L'adulte lit deux fois le même passage : la première fois sans ton, la seconde en le faisant vivre. Qu'est-ce qui change ?",
        `Établir ensemble la grille d'écoute : la ponctuation, les groupes de sens, les liaisons, le volume, le débit, le récit et le dialogue${cm2 ? ", les effets, les mots importants" : ""}.`,
        "Ce qu'on retient : la grille d'écoute de la classe, affichée."),
      trois("Préparer sa lecture : la partition", cm2 ? "préparer la mise en voix d'un texte : l'intonation, les effets, les mots à faire ressortir." : "préparer la lecture d'un texte : les pauses, les liaisons, l'intonation.",
        "Le texte à préparer : on le lit en silence, deux fois, pour le comprendre.",
        `Coder les liaisons, les pauses et l'intonation avec les signes de la classe ; écrire dans la marge comment lire — plus fort, plus vite, la voix d'un personnage${cm2 ? ", un effet" : ""} ; s'entraîner en binôme${cm2 ? ", s'enregistrer et s'écouter" : ""}.`,
        "Ce qu'on retient : préparer, c'est comprendre, coder, s'entraîner."),
      trois("Lire devant un public", "lire un texte préparé devant un public, et recevoir un conseil.",
        "Les lecteurs se préparent ; le public prend la grille d'écoute.",
        "Lectures devant la classe, ou pour une autre classe ; chaque lecteur reçoit, avec la grille, un point fort et un conseil.",
        "Ce qu'on retient : mon point fort et mon conseil pour la prochaine lecture."),
      entrainement("S'entraîner : le récit et les voix", "faire entendre le récit et les voix des personnages.",
        "Lire à deux ou trois voix une scène ou un passage dialogué : le narrateur, les personnages ; changer de voix selon les indications du texte.",
        "Ce qu'on retient : chaque personnage a sa voix ; le narrateur garde la sienne."),
      evaluation("lire à voix haute un texte préparé, évalué avec la grille", "Ensuite, des lectures régulières : aux plus jeunes, pour un spectacle, un podcast."),
    ],
  };
};

// ── Comprendre seul des textes ────────────────────────────────────────────

const COMPRENDRE_CM1: Demarche = {
  id: "comprendre-cm1", nom: "Comprendre un texte : l'explicite, l'implicite, qui raconte, le genre (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Développer des stratégies de compréhension : repérer les informations explicites et pointer les implicites ; répondre aux questions en justifiant par une phrase du texte ; identifier le narrateur, les personnages, le personnage principal et le thème ; choisir un titre qui résume l'histoire ; distinguer, par la mise en page et les caractéristiques d'écriture, un extrait de théâtre, un poème, un texte narratif (exemples de réussite du CM1). Les textes, d'une page, sont écrits pour Maitrize.",
  seances: [
    trois("C'est écrit, ou je le déduis", "répondre à une question en justifiant par une phrase du texte.",
      "Une question au tableau, sur un court passage : la réponse est-elle écrite ? Sinon, comment la trouver ?",
      "Lire le texte ; répondre aux questions en écrivant le numéro de la ligne qui prouve ; trier les questions : c'est écrit, je réfléchis.",
      "Ce qu'on retient : je justifie ma réponse par une phrase du texte ; ce qui n'est pas écrit se déduit d'un indice et de ce que je sais."),
    trois("Ce qui n'est pas écrit : les inférences", "trouver une information implicite à partir d'un indice et de ce qu'on sait.",
      "« J'ai pris mon parapluie. » Que comprend-on, sans que ce soit écrit ?",
      "Pour chaque question : l'indice du texte, ce que je sais déjà, donc ce que je comprends ; juger des affirmations : vrai, faux, ou je ne peux pas savoir.",
      "Ce qu'on retient : un indice et ce que je sais donnent ce que je comprends."),
    trois("Qui raconte ? Les personnages, le thème", "identifier le narrateur, les personnages, le personnage principal et le thème d'un texte.",
      "Deux débuts de récit : l'un dit « je », l'autre « il ». Qui raconte ?",
      "Identifier le narrateur, les personnages et le personnage principal ; dire le thème en quelques mots ; choisir un titre qui résume l'histoire.",
      "Ce qu'on retient : le narrateur peut être un personnage, ou rester hors de l'histoire ; au théâtre, il n'y en a pas."),
    trois("Récit, poème ou théâtre ?", "distinguer un récit, un poème et un extrait de théâtre par leur mise en page et leur écriture.",
      "Trois textes affichés de loin : sans les lire, que reconnaît-on ?",
      "Comparer la mise en page et l'écriture : les vers et les strophes, les noms des personnages et les didascalies, les paragraphes ; classer des extraits.",
      "Ce qu'on retient : les indices de chaque genre, dans le cahier de références."),
    entrainement("S'entraîner : comprendre un texte", "comprendre seul un texte d'une page et le dire avec ses mots.",
      "Un texte par semaine : le lire, répondre en justifiant, trouver le sens d'un mot inconnu, puis le résumer à l'oral à son voisin.",
      "Ce qu'on retient : je reviens au texte pour prouver."),
    evaluation("comprendre un texte d'une page : l'explicite, l'implicite, qui raconte, son genre", "Ensuite, ces stratégies accompagnent chaque lecture du livre de la classe."),
  ],
};

const COMPRENDRE_CM2: Demarche = {
  id: "comprendre-cm2", nom: "Comprendre des textes plus longs : l'essentiel, la chronologie, les genres (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Poursuivre son apprentissage de lecteur autonome face à des textes de plus en plus longs et complexes ; restituer l'essentiel d'un texte qui contient des informations explicites et implicites ; reconnaître et nommer les principaux genres littéraires à l'aide de critères travaillés en classe. Exemples de réussite : s'appuyer sur les connecteurs et les reprises pronominales ; élaborer des inférences ; comprendre la chronologie du récit et ses sauts dans le temps ; trouver les idées essentielles et proposer des titres de paragraphes ; échanger sur un personnage, ses motivations et ses projets en s'appuyant sur le texte.",
  seances: [
    trois("Les reprises et les connecteurs", "suivre les personnages à travers leurs reprises, et repérer les connecteurs.",
      "« Il », « elle », « l'horloger », « lui » : qui est qui ?",
      "Relier chaque reprise à ce qu'elle désigne, en vérifiant par le remplacement ; repérer les connecteurs de temps et de cause.",
      "Ce qu'on retient : suivre les reprises, c'est suivre les personnages ; les connecteurs relient les moments et les idées."),
    trois("Les sauts dans le temps", "remettre les évènements d'un récit dans l'ordre chronologique.",
      "Un récit qui commence par la fin : dans quel ordre les évènements sont-ils arrivés ?",
      "Relever les indicateurs de temps — trois semaines plus tôt, le lendemain, au matin — ; remettre les moments dans l'ordre chronologique ; dire l'effet du retour en arrière.",
      "Ce qu'on retient : l'ordre du récit n'est pas toujours celui des évènements."),
    trois("L'essentiel d'un texte", "donner un titre à chaque paragraphe et restituer l'essentiel d'un texte.",
      "Un texte en paragraphes : que dit chacun ?",
      "Donner un titre à chaque paragraphe ; écrire l'essentiel en trois ou quatre phrases ; comparer les résumés et garder ce qu'on ne peut pas enlever.",
      "Ce qu'on retient : l'essentiel, c'est ce qu'on ne peut pas enlever sans changer l'histoire."),
    trois("Les genres littéraires", "nommer le genre d'un texte et le justifier par des critères.",
      "Des extraits : une fable, un poème, une scène de théâtre, un récit merveilleux, un documentaire.",
      "Nommer le genre de chaque extrait et le justifier par deux indices ; compléter le tableau des genres.",
      "Ce qu'on retient : les critères de chaque genre, dans le cahier de références."),
    entrainement("S'entraîner : un texte plus long", "comprendre seul un texte long et en débattre en s'appuyant sur lui.",
      "Un texte par semaine : faire des inférences, restituer l'essentiel à l'oral puis à l'écrit ; débattre des motivations d'un personnage, preuves à l'appui.",
      "Ce qu'on retient : je m'appuie sur le texte pour justifier mon interprétation."),
    evaluation("restituer l'essentiel d'un texte, faire des inférences et nommer son genre", "Ensuite, ces stratégies servent les œuvres lues en classe."),
  ],
};

// ── Lire des documents ────────────────────────────────────────────────────

const DOCUMENTS_CM1: Demarche = {
  id: "documents-cm1", nom: "Lire des documents : nature, source, sommaire, document composite (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Donner la nature et la source d'un document — une photographie, un extrait de fable, un tableau, un graphique, un plan, un texte documentaire — ; identifier les genres de documents et leurs caractéristiques ; trouver dans des documents simples les réponses à des questions, en s'aidant du sommaire, du lexique et de l'index ; découvrir des documents composites et y repérer des informations par un questionnement. Les documents viennent aussi de la géographie et des sciences (exemples de réussite du CM1).",
  seances: [
    trois("La nature et la source d'un document", "dire ce qu'est un document et d'où il vient.",
      "Six documents sur une même page : une photographie, des vers, un tableau, un graphique, un plan, un texte. Qu'ont-ils de différent ?",
      "Pour chaque document, écrire sa nature, sa source, et ce qui permet de reconnaître sa nature ; chercher la source sous la photographie, sous le texte, sous le tableau.",
      "Ce qu'on retient : la nature, c'est ce qu'est le document ; la source, d'où il vient — son auteur, son titre, sa date."),
    trois("Chercher dans un livre documentaire", "utiliser le sommaire, le lexique et l'index pour chercher une information.",
      "Une question de recherche : où chercher, dans ce livre, ce que mange le martin-pêcheur ?",
      "Lire le sommaire ; pour chaque recherche, dire où chercher et à quelle page ; distinguer le sommaire, le lexique et l'index.",
      "Ce qu'on retient : le sommaire suit les pages ; le lexique explique les mots ; l'index les range dans l'ordre alphabétique."),
    trois("Un document composite", "trouver une information dans un document composite grâce à des questions.",
      "Une page de documentaire : un titre, un chapeau, un schéma, un encadré, un tableau. Par où commencer ?",
      "Parcourir le document en entier ; pour chaque question, chercher dans la bonne partie et dire où l'on a trouvé.",
      "Ce qu'on retient : je regarde tout le document, puis je cherche dans la bonne partie."),
    entrainement("S'entraîner : les documents des autres disciplines", "lire les documents des manuels de géographie et de sciences.",
      "Une page du manuel de géographie ou de sciences : nommer la nature et la source de chaque document, puis y chercher des réponses.",
      "Ce qu'on retient : je nomme le document avant de le lire."),
    evaluation("donner la nature et la source de documents et y trouver des informations", "Ensuite, chaque document de géographie, d'histoire ou de sciences se présente par sa nature et sa source."),
  ],
};

const DOCUMENTS_CM2: Demarche = {
  id: "documents-cm2", nom: "Lire des documents : composites, rapprochés, tableaux à double entrée (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Reconnaître et nommer les caractéristiques des différents éléments d'un document composite ; rapprocher deux documents convergents, de genres différents, pour repérer et compléter les informations ; à partir de questions, prélever des informations, en faisant des inférences si nécessaire, et les combiner pour donner un sens global aux documents. Exemples de réussite : distinguer sur une page de manuel un schéma et le texte qui l'accompagne ; lire un tableau à double entrée ; relier les informations d'un texte à celles d'un tableau ou d'une image en histoire, en géographie, en sciences.",
  seances: [
    trois("Les éléments d'un document composite", "nommer les éléments d'un document composite et dire à quoi sert chacun.",
      "Une page de documentaire : quelles en sont les parties ?",
      "Nommer chaque partie — le titre, le chapeau, le schéma, sa légende, l'encadré, le tableau, la source — ; chercher des réponses en combinant le texte, le schéma et le tableau.",
      "Ce qu'on retient : chaque élément a son rôle ; je combine leurs informations."),
    trois("Rapprocher deux documents", "rapprocher deux documents de genres différents pour compléter les informations.",
      "Un texte et une fiche d'identité sur le même animal : que dit l'un que l'autre ne dit pas ?",
      "Répondre en cherchant dans un document, dans l'autre ou dans les deux ; classer ce qu'on apprend : seulement dans le texte, seulement dans la fiche, dans les deux.",
      "Ce qu'on retient : deux documents se complètent ; je dis d'où vient chaque information."),
    trois("Lire un tableau à double entrée", "lire un tableau à double entrée et en tirer des informations.",
      "Un tableau : les livres empruntés par deux classes. Où lire combien de documentaires les CM2 ont empruntés ?",
      "Suivre la ligne et la colonne jusqu'à leur croisement ; comparer ; calculer un total.",
      "Ce qu'on retient : une case est au croisement d'une ligne et d'une colonne."),
    entrainement("S'entraîner : prélever et combiner", "répondre à des questions qui demandent plusieurs documents.",
      "Des questions qui demandent deux documents, ou une inférence, dans les manuels d'histoire, de géographie, de sciences.",
      "Ce qu'on retient : je combine les informations et je dis d'où elles viennent."),
    evaluation("prélever et combiner des informations dans plusieurs documents", "Ensuite, l'exposé : chercher, combiner, présenter."),
  ],
};

// ── Lire une œuvre ────────────────────────────────────────────────────────

const oeuvre = (classe: "CM1" | "CM2"): Demarche => {
  const cm2 = classe === "CM2";
  return {
    id: `oeuvre-${classe.toLowerCase()}`, nom: `Lire des œuvres et se les approprier : le carnet de lecteur (${classe})`, famille: "Français",
    source: PROGRAMME_FRANCAIS_C3,
    resume: cm2
      ? "Lire au moins sept œuvres dans l'année — trois du patrimoine et quatre de littérature de jeunesse au CM2 — et en garder la mémoire ; mettre le texte lu en relation avec une autre œuvre ou une autre référence culturelle, et avec ses expériences personnelles ; développer le plaisir de lire, notamment avec des œuvres choisies ; s'engager et persévérer. Exemples de réussite : un carnet de lecture ou un portfolio ; porter un jugement sur les personnages, dire auquel on s'identifie et pourquoi ; argumenter ses choix d'interprétation ; partager son plaisir de lecteur. Les six entrées littéraires et les œuvres proposées par les exemples de réussite guident les choix."
      : "Lire au moins sept œuvres dans l'année — deux du patrimoine et cinq de littérature de jeunesse au CM1 — et en garder la mémoire dans un carnet de lecteur ; mettre le texte lu en relation avec une œuvre lue en classe ; créer des liens avec ses expériences et ses connaissances ; varier les genres, les formats et les thèmes ; s'engager et persévérer. Exemples de réussite : comparer ses lectures, formuler des hypothèses d'interprétation à partir d'histoires connues, prendre plaisir à partager sa lecture. Les six entrées littéraires et les œuvres proposées par les exemples de réussite guident les choix.",
    seances: [
      trois("Choisir ses lectures", "choisir un livre parmi les six entrées de l'année et s'engager à le lire.",
        "Les six entrées de l'année ; des livres de chacune, sur les tables.",
        "Feuilleter, lire les quatrièmes de couverture et les premières pages ; choisir son livre ; ouvrir le tableau de ses lectures de l'année.",
        "Ce qu'on retient : je choisis un livre qui me donne envie, et je m'engage à le finir."),
      trois("Le carnet de lecteur", "garder la mémoire d'un livre : un passage, un personnage, un avis justifié.",
        "Ce qu'on garde d'un livre : un passage, un personnage, une émotion, un avis.",
        `Remplir la page du carnet sur le livre de la classe : ce qu'on retient, le passage recopié, le personnage ${cm2 ? "auquel on s'identifie ou dont on se distingue" : "auquel on ressemble"}, un avis justifié ; puis partager.`,
        "Ce qu'on retient : mon carnet garde la mémoire de mes lectures."),
      trois(cm2 ? "Relier le livre à d'autres œuvres" : "Relier ses lectures", cm2 ? "mettre un livre en relation avec une autre œuvre ou une référence culturelle." : "mettre un livre en relation avec une œuvre lue en classe.",
        cm2 ? "Le livre de la classe, un film, un tableau ou une chanson sur le même thème : qu'ont-ils en commun ?" : "Le livre de la classe et un livre lu avant : qu'ont-ils en commun ?",
        "Comparer avec le tableau : le héros, ce qu'il cherche, la fin ; ce qui rapproche, ce qui distingue ; formuler des hypothèses d'interprétation à partir d'histoires connues.",
        "Ce qu'on retient : une lecture en éclaire une autre."),
      cm2
        ? trois("Le cercle de lecture", "préparer un rôle et débattre d'un passage en s'appuyant sur le texte.",
          "Le même passage pour tous ; cinq rôles : le meneur de discussion, le chercheur de mots, le relieur, l'illustrateur, le lecteur à voix haute.",
          "Chacun prépare son rôle, puis le cercle échange : impressions, interprétations, jugements sur les personnages, toujours justifiés par le texte.",
          "Ce qu'on retient : on peut ne pas être d'accord, si chacun s'appuie sur le texte.")
        : trois("Partager sa lecture", "présenter un livre aimé pour donner envie de le lire.",
          "Pourquoi un camarade lirait-il le livre que j'ai aimé ?",
          "Préparer la présentation — l'accroche, l'histoire sans dévoiler la fin, un passage lu, l'avis justifié — ; présenter ; le public écoute avec la grille.",
          "Ce qu'on retient : donner envie sans tout raconter."),
      cm2
        ? trois("Présenter un livre : défi lecture, podcast", "présenter un livre à un public, à l'oral ou enregistré.",
          "Un défi lecture entre classes, ou un podcast de la classe : comment donner envie de lire ?",
          "Préparer la présentation à partir de mots clés ; s'enregistrer, s'écouter, s'améliorer ; présenter.",
          "Ce qu'on retient : un avis justifié et un passage bien lu donnent envie.")
        : rituel("Le rendez-vous de lecture (chaque semaine)", "lire un livre choisi et persévérer jusqu'à la fin.", 20,
          "Un temps de lecture personnelle ; chacun note où il en est dans son tableau ; l'adulte aide celui qui s'est arrêté à reprendre son livre ou à en changer."),
      ...(cm2 ? [rituel("Le rendez-vous de lecture (chaque semaine)", "lire un livre choisi et persévérer jusqu'à la fin.", 20,
        "Un temps de lecture personnelle ; chacun note où il en est dans son tableau ; l'adulte aide celui qui s'est arrêté à reprendre son livre ou à en changer.")] : []),
    ],
  };
};

export const DEMARCHES_LECTURE_CM: Demarche[] = [
  fluence("CM1"), voixHaute("CM1"), COMPRENDRE_CM1, DOCUMENTS_CM1, oeuvre("CM1"),
  fluence("CM2"), voixHaute("CM2"), COMPRENDRE_CM2, DOCUMENTS_CM2, oeuvre("CM2"),
];

/** La séquence d'une compétence de lecture du cours moyen ; en minuscules sans accents. */
export function demarcheDeLaLectureCM(classe: string, cg: string): string | null {
  if (classe !== "cm1" && classe !== "cm2") return null;
  if (/lire avec fluidite/.test(cg)) return `fluence-${classe}`;
  if (/expressivite/.test(cg)) return `voix-haute-${classe}`;
  if (/lire et comprendre seul/.test(cg)) return `comprendre-${classe}`;
  if (/pour apprendre dans toutes les disciplines/.test(cg)) return `documents-${classe}`;
  if (/lire une (oe|œ)uvre/.test(cg)) return `oeuvre-${classe}`;
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

type Classe = "CM1" | "CM2";
const cx = (seance: number, titre: string, classe: Classe, exercice: ExerciceComprehension, texte = ""): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_COMPREHENSION, classe, exercice, texte };
  return { seance, atelier: "comprehension", titre, fabriquer: (g) => ({ html: htmlComprehension(reglages, g), style: STYLE_FEUILLE + STYLE_COMPREHENSION, refaire: { comprehension: reglages } }) };
};
const lc = (seance: number, titre: string, classe: Classe, exercice: ExerciceLectureCM, texte = ""): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_LECTURE_CM, classe, exercice, texte };
  const atelier = exercice === "chronometre" || exercice === "irreguliers" ? "fluence" : "voixHaute";
  return { seance, atelier, titre, fabriquer: (g) => ({ html: htmlLectureCM(reglages, g), style: STYLE_FEUILLE + STYLE_LECTURE_CM }) };
};
const dc = (seance: number, titre: string, classe: Classe, exercice: ExerciceDocumentsCM): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_DOCUMENTS_CM, classe, exercice };
  return { seance, atelier: "comprehension", titre, fabriquer: (g) => ({ html: htmlDocumentsCM(reglages, g), style: STYLE_FEUILLE + STYLE_DOCUMENTS_CM }) };
};
const lk = (seance: number, titre: string, classe: Classe, exercice: ExerciceLecteurCM): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_LECTEUR_CM, classe, exercice };
  return { seance, atelier: "lecteur", titre, fabriquer: () => ({ html: htmlLecteurCM(reglages), style: STYLE_FEUILLE + STYLE_LECTEUR_CM }) };
};

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "fluence-cm1": {
    feuilles: [lc(0, "Je lis en une minute", "CM1", "chronometre", "chien-gare-cm1"), lc(1, "Le texte de la semaine", "CM1", "chronometre", "castor-cm1"),
      lc(2, "Les mots irréguliers", "CM1", "irreguliers"), lc(4, "Je lis en une minute — mesure", "CM1", "chronometre", "cross-cm1")],
    materiel: ["Un chronomètre par binôme ; le texte chronométré en deux exemplaires", "Le texte de la semaine ; un chronomètre par binôme", "La liste des mots irréguliers de la classe", "Un texte d'une page du livre de la classe", "Un chronomètre ; le texte de la mesure"],
  },
  "fluence-cm2": {
    feuilles: [lc(0, "Je lis en une minute", "CM2", "chronometre", "horloge-cm2"), lc(1, "Le texte de la semaine", "CM2", "chronometre", "eau-cm2"),
      lc(2, "Les mots irréguliers", "CM2", "irreguliers"), lc(4, "Je lis en une minute — mesure", "CM2", "chronometre", "match-cm2")],
    materiel: ["Un chronomètre par binôme ; le texte chronométré en deux exemplaires", "Le texte de la semaine ; un chronomètre par binôme", "La liste des mots irréguliers de la classe", "Un texte long du livre de la classe", "Un chronomètre ; le texte de la mesure"],
  },
  "voix-haute-cm1": {
    feuilles: [lc(0, "La grille d'écoute", "CM1", "grille"), lc(1, "Je prépare ma lecture", "CM1", "partition", "soupe-cm1"), lc(2, "La grille d'écoute", "CM1", "grille"),
      lc(3, "Je prépare ma lecture — le récit et les voix", "CM1", "partition", "cross-cm1"), lc(4, "Je prépare ma lecture — évaluation", "CM1", "partition", "chien-gare-cm1")],
    materiel: ["Un passage du livre de la classe, lu deux fois par l'adulte", "La carte du code de la lecture de la classe", "Les textes préparés ; la grille d'écoute", "Une scène ou un passage dialogué", "La grille d'écoute"],
  },
  "voix-haute-cm2": {
    feuilles: [lc(0, "La grille d'écoute", "CM2", "grille"), lc(1, "Je prépare ma lecture", "CM2", "partition", "proces-cm2"), lc(2, "La grille d'écoute", "CM2", "grille"),
      lc(3, "Je prépare ma lecture — le récit et les voix", "CM2", "partition", "horloge-cm2"), lc(4, "Je prépare ma lecture — évaluation", "CM2", "partition", "match-cm2")],
    materiel: ["Un passage du livre de la classe, lu deux fois par l'adulte", "La carte du code de la lecture ; un enregistreur ou une tablette", "Les textes préparés ; la grille d'écoute", "Une scène ou un passage dialogué", "La grille d'écoute"],
  },
  "comprendre-cm1": {
    feuilles: [cx(0, "Je comprends le texte", "CM1", "questions", "chien-gare-cm1"), cx(1, "Ce qui n'est pas écrit", "CM1", "inferences", "cross-cm1"),
      cx(1, "Vrai, faux, ou je ne peux pas savoir", "CM1", "vraiFaux", "cross-cm1"), cx(2, "Qui raconte ?", "CM1", "narrateur", "chien-gare-cm1"),
      cx(3, "Quel type de texte ?", "CM1", "typesDeTextes"), cx(4, "Le mot inconnu", "CM1", "motInconnu"), cx(5, "Je comprends le texte — évaluation", "CM1", "questions", "castor-cm1")],
    materiel: ["Un court passage au tableau", "« J'ai pris mon parapluie » au tableau", "Deux débuts de récit, l'un en « je », l'autre en « il »", "Un récit, un poème et une scène affichés", "Le texte de la semaine", "Les feuilles d'évaluation"],
  },
  "comprendre-cm2": {
    feuilles: [cx(0, "Qui est qui ?", "CM2", "reprises", "horloge-cm2"), cx(1, "Les moments de l'histoire", "CM2", "moments", "match-cm2"),
      cx(2, "L'essentiel du texte", "CM2", "paragraphes", "horloge-cm2"), cx(3, "Quel genre de texte ?", "CM2", "genres"),
      cx(4, "Ce qui n'est pas écrit", "CM2", "inferences", "demain-cm2"), cx(5, "Je comprends le texte — évaluation", "CM2", "questions", "proces-cm2")],
    materiel: ["Le texte projeté ; des surligneurs", "Un récit qui commence par la fin", "Le texte en paragraphes", "Des extraits de genres différents", "Le texte de la semaine", "Les feuilles d'évaluation"],
  },
  "documents-cm1": {
    feuilles: [dc(0, "La nature et la source d'un document", "CM1", "nature-source"), dc(1, "Chercher dans un livre documentaire", "CM1", "sommaire"),
      dc(2, "Un document composite", "CM1", "composite"), dc(4, "Les documents — évaluation", "CM1", "nature-source")],
    materiel: ["Six documents projetés", "Des livres documentaires de la bibliothèque", "Une page de documentaire projetée", "Le manuel de géographie ou de sciences", "Les feuilles d'évaluation"],
  },
  "documents-cm2": {
    feuilles: [dc(0, "Un document composite", "CM2", "composite"), dc(1, "Deux documents", "CM2", "deux-documents"),
      dc(2, "Lire un tableau à double entrée", "CM2", "double-entree"), dc(4, "Les documents — évaluation", "CM2", "deux-documents")],
    materiel: ["Une page de documentaire projetée", "Un texte et une fiche sur le même sujet", "Un tableau à double entrée projeté", "Les manuels d'histoire, de géographie, de sciences", "Les feuilles d'évaluation"],
  },
  "oeuvre-cm1": {
    feuilles: [lk(0, "Choisir mes lectures", "CM1", "entrees"), lk(0, "Mes lectures de l'année", "CM1", "lectures"), lk(1, "Mon carnet de lecteur", "CM1", "carnet"),
      lk(2, "Relier deux œuvres", "CM1", "relier"), lk(3, "Présenter un livre", "CM1", "presenter")],
    materiel: ["Des livres des six entrées, sur les tables", "Le livre de la classe ; le carnet de lecteur", "Le livre de la classe et un livre lu avant", "Le livre choisi par chacun", "Le livre choisi ; le tableau de ses lectures"],
  },
  "oeuvre-cm2": {
    feuilles: [lk(0, "Choisir mes lectures", "CM2", "entrees"), lk(0, "Mes lectures de l'année", "CM2", "lectures"), lk(1, "Mon carnet de lecteur", "CM2", "carnet"),
      lk(2, "Relier deux œuvres", "CM2", "relier"), lk(3, "Le cercle de lecture", "CM2", "cercle"), lk(4, "Présenter un livre", "CM2", "presenter")],
    materiel: ["Des livres des six entrées, sur les tables", "Le livre de la classe ; le carnet de lecteur", "Le livre de la classe ; un film, un tableau ou une chanson sur le même thème", "Un passage du livre de la classe ; les cartes des rôles", "Un enregistreur ou une tablette", "Le livre choisi ; le tableau de ses lectures"],
  },
};

export const estUneDemarcheDeLectureCM = (id: string) => id in PLANS;

export function planDeLaLectureCM(demarcheId: string, _ctx?: ContexteFeuilles): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
