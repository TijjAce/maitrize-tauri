// Les démarches du français au cycle 2, d'après les livrets.
//
// Les livrets d'accompagnement du programme de français (Éduscol : CP 2025,
// CE1 et CE2 2026) proposent sept séquences ; on en tire les démarches que
// la création d'une séquence propose, compétence par compétence :
// - CP, n° 1 « Acquérir le décodage et l'encodage des CGP et entrer dans la
//   lecture à voix haute » : la routine d'une correspondance en deux jours,
//   puis les entraînements ritualisés — précision et vitesse (focus 1),
//   prosodie (focus 2) ;
// - CP, n° 2 « Apprendre à écrire en écriture cursive » : le geste (focus 1),
//   la copie (focus 2) — le livret en donne aussi les repères du CE1 ;
// - CP, n° 3, CE1, n° 2, CE2, n° 2 : enrichir son vocabulaire — collecter,
//   catégoriser, réactiver —, autour de la course, de l'alimentation, du bleu ;
// - CE1, n° 1 « De l'identification des mots à la lecture prosodique de
//   phrases » : automatiser la lecture des CGP (focus 1), la prosodie (focus 2) ;
// - CE2, n° 1 « Lecture : enseigner la fluence à visée expressive » : une fable
//   de La Fontaine lue à la classe.
// Les livrets n'ont pas de séquence pour la compréhension, la production
// d'écrits, l'oral ou la grammaire : la compréhension et le parcours de
// lecteur ont leurs séquences, bâties sur le programme et les guides (voir
// demarchesLecture.ts) ; les autres compétences gardent les démarches des
// guides (voir demarches.ts).

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";

const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });

const LIVRET = (classe: "CP" | "CE1" | "CE2", n: number, titre: string) =>
  `Éduscol, livret d'accompagnement du programme de français du ${classe} (${classe === "CP" ? 2025 : 2026}), « Proposition de séquence n° ${n} – ${titre} »`;

/** Une séance courte de la routine d'une CGP : un objectif dit, une activité, ce qu'on retient. */
const courte = (titre: string, objectifs: string, activite: string, retenir = "Ce qu'on a appris, dit par les élèves ; le mur sonore à jour.") =>
  seance(titre, objectifs, 15, [ph(T1, "2 min", "L'objectif de la séance, annoncé ; ce qu'on sait déjà, rappelé."), ph(T2, "10 min", activite), ph(T3, "3 min", retenir)]);

// ── CP : une CGP en deux jours ────────────────────────────────────────────

const CGP_CP: Demarche = {
  id: "cgp-deux-jours-cp",
  nom: "Une correspondance graphème-phonème en deux jours (CP)",
  famille: "Français",
  source: LIVRET("CP", 1, "Acquérir le décodage et l'encodage des CGP et entrer dans la lecture à voix haute"),
  resume: "La routine du livret CP pour chaque nouvelle correspondance graphème-phonème : deux jours de séances collectives qui ne dépassent pas 20 minutes — découvrir, écrire, encoder, décoder, mémoriser ; puis lire, écrire, dicter, copier —, et dans la semaine des entraînements ritualisés en groupes de besoin. Fin de période 1 : 12 à 15 CGP ; milieu d'année : 25 à 30.",
  seances: [
    seance("Jour 1 — Découvrir la nouvelle CGP",
      "À la fin de cette séance, les élèves sauront reconnaître le nouveau graphème, prononcer son phonème, et lire des syllabes qui le contiennent.",
      20, [
        ph(T1, "3 min", "L'objectif de la semaine, annoncé : une nouvelle correspondance."),
        ph(T2, "14 min", "Observation du nouveau graphème ; le professeur prononce le phonème, puis les élèves ; lecture de compositions syllabiques : C, V, CV, VC, CVC, CCV…"),
        ph(T3, "3 min", "Le graphème et son phonème rejoignent le mur sonore."),
      ]),
    courte("Jour 1 — Le geste graphique", "À la fin de cette séance, les élèves sauront écrire le graphème étudié, et une syllabe, en cursive.",
      "Écriture du graphème étudié et d'une syllabe."),
    courte("Jour 1 — Encoder", "À la fin de cette séance, les élèves sauront encoder des syllabes et des mots avec le graphème étudié.",
      "Encodage de syllabes, puis de mots."),
    courte("Jour 1 — Décoder", "À la fin de cette séance, les élèves sauront lire des syllabes et des mots avec le graphème étudié.",
      "Lecture de syllabes, puis de mots."),
    courte("Jour 1 — Mémoriser l'orthographe", "À la fin de cette séance, les élèves sauront écrire de mémoire quelques mots entièrement décodables.",
      "Mémorisation orthographique de mots entièrement décodables."),
    courte("Jour 2 — Décoder", "À la fin de cette séance, les élèves sauront lire des mots, des phrases, un texte qui contiennent le graphème étudié.",
      "Lecture de mots, de phrases, d'un texte."),
    courte("Jour 2 — Le geste graphique", "À la fin de cette séance, les élèves sauront écrire des mots et une phrase contenant le graphème étudié.",
      "Écriture de mots et de phrases contenant le graphème étudié."),
    courte("Jour 2 — Encoder : la dictée", "À la fin de cette séance, les élèves sauront écrire sous la dictée des mots et une phrase avec le graphème étudié.",
      "Dictée de mots, de phrases."),
    courte("Jour 2 — Copier, écrire", "À la fin de cette séance, les élèves sauront copier un texte déchiffrable et écrire avec le graphème étudié.",
      "Copie de corpus déchiffrables contenant le graphème étudié ; une gamme d'écriture en lien avec la CGP."),
    seance("Entraînements de la semaine, en groupes de besoin",
      "À la fin de cette séance, les élèves sauront lire plus vite et plus juste ce qu'ils ont appris, chacun à son niveau.",
      20, [ph(T4, "20 min", "Des séances ritualisées en groupes de besoin : la précision et la vitesse de lecture pour les non-décodeurs (moins de 10 mots lus correctement par minute) et les faibles décodeurs (10 à 30) ; la fluence et la lecture à voix haute de phrases et de textes pour les bons et très bons décodeurs (plus de 30).",
        "Évalue la fluence pour former les groupes, et revois-les souvent.")]),
  ],
};

// ── CP et CE1 : précision et vitesse ─────────────────────────────────────

const PRECISION_CP: Demarche = {
  id: "precision-vitesse-cp",
  nom: "Précision et vitesse de lecture : la semaine en ateliers (CP)",
  famille: "Français",
  source: `${LIVRET("CP", 1, "Acquérir le décodage et l'encodage des CGP et entrer dans la lecture à voix haute")}, focus 1`,
  resume: "Le premier focus du livret CP, dès la période 1 et tout au long du cycle — pour tous en période 1, puis pour les non-décodeurs et les faibles décodeurs autant que nécessaire : chaque semaine, une liste de syllabes, de pseudo-mots et de mots, préparée en binôme, lue en atelier guidé, chronométrée, évaluée. Le critère : améliorer le nombre de CGP et de mots correctement lus par minute. Fin de CP : 30 mots par minute sans préparation, 50 après.",
  seances: [
    seance("Jour 1 — Préparer la liste, en binôme",
      "À la fin de cette séance, les élèves sauront lire la nouvelle liste en s'aidant des outils de la classe.",
      15, [ph("En autonomie", "15 min", "En binôme, la préparation de la nouvelle liste avec les outils : le mur sonore, la synthèse vocale…")]),
    seance("Jour 2 — Atelier guidé",
      "À la fin de cette séance, les élèves sauront lire chaque CGP et chaque mot de la liste, et savoir comment ils y arrivent.",
      20, [
        ph(T1, "5 min", "Les élèves reformulent la consigne et les attentes de l'atelier ; on relit les traces écrites des séances précédentes, qui rappellent les méthodes et les outils."),
        ph(T2, "10 min", "Les binômes confrontent leurs décodages de la liste ; mise en commun ; on statue sur la lecture de chaque CGP et de chaque mot, en dictée à l'adulte. Le jeu des quatre jetons alignés : le premier qui aligne quatre jetons a gagné."),
        ph(T3, "5 min", "La synthèse des acquis, le point sur les difficultés ; l'objectif de l'entraînement du lendemain."),
      ]),
    seance("Jour 3 — Entraînement chronométré",
      "À la fin de cette séance, les élèves sauront lire la liste plus vite qu'au premier jour.",
      15, [ph("En autonomie", "15 min", "Seul, ou en trinôme — un chronométreur, un vérificateur, un lecteur — : on lit la liste en une minute, on note son score.")]),
    seance("Jour 4 — Atelier guidé d'évaluation",
      "À la fin de cette séance, les élèves sauront combien d'items ils lisent correctement en une minute, et de combien ils ont progressé.",
      20, [
        ph(T1, "5 min", "Comme au jour 2 : la consigne, les outils rappelés."),
        ph(T2, "10 min", "L'évaluation chronométrée ; puis la copie cursive de la liste."),
        ph(T3, "5 min", "Les progrès de la semaine ; la nouvelle liste remise pour la semaine suivante."),
      ]),
  ],
};

const PRECISION_CE1: Demarche = {
  id: "precision-vitesse-ce1",
  nom: "Automatiser la lecture des CGP : la semaine en ateliers (CE1-CE2)",
  famille: "Français",
  source: `${LIVRET("CE1", 1, "De l'identification des mots à la lecture prosodique de phrases")}, focus 1 ; repris au CE2 pour les élèves qui décodent encore lentement (livret CE2, n° 1)`,
  resume: "Le premier focus du livret CE1, dès la période 1 et tout au long du cycle — pour tous en début d'année, puis pour les non-décodeurs (moins de 10 mots par minute) et les faibles décodeurs (10 à 40) autant que nécessaire : une grille de fluence par semaine, pour les graphèmes de la semaine, lue avec vitesse et précision. Au CE2, le livret la reprend, sur les supports du CP et du CE1, pour les élèves qui décodent encore lentement.",
  seances: [
    seance("Jour 1 — Atelier guidé : une nouvelle grille",
      "À la fin de cette séance, les élèves sauront lire la nouvelle grille de fluence, et dire comment ils lisent chaque graphème de la semaine.",
      20, [
        ph(T1, "5 min", "D'abord l'évaluation chronométrée sur la grille de la semaine précédente. Puis une nouvelle grille ; les graphèmes de la semaine au tableau — er, ez, es, é —, oralisés ; la consigne et les attentes ; on relit les traces écrites précédentes."),
        ph(T2, "10 min", "Lecture individuelle de la nouvelle grille, confrontation en binôme, validation avec le professeur. Puis des jeux : le jeu de l'ascenseur ou le syllabaire pour le groupe 1 ; des jeux de rapidité — la tapette à mots — pour le groupe 2.",
          "Les élèves du groupe 2 qui lisent plus de 30 mots par minute reçoivent en avance les phrases du lendemain."),
        ph(T3, "5 min", "On statue sur la lecture de chaque CGP et de chaque mot, en dictée à l'adulte ; une trace écrite rappelle les outils : le mur sonore, l'ordinateur, le féminin, un mot de la même famille."),
      ]),
    seance("Jour 2 — Entraînement en trinôme",
      "À la fin de cette séance, les élèves sauront lire la grille plus vite qu'au premier jour.",
      15, [ph("En autonomie", "15 min", "Le groupe 1 s'entraîne en trinôme : un chronométreur, un vérificateur, un lecteur.")]),
    seance("Jour 3 — Atelier guidé : évaluation intermédiaire",
      "À la fin de cette séance, les élèves sauront où ils en sont, et ce qu'ils visent le lendemain.",
      20, [
        ph(T1, "5 min", "Une relecture non chronométrée de la grille."),
        ph(T2, "10 min", "Une évaluation intermédiaire chronométrée ; puis la copie cursive."),
        ph(T3, "5 min", "La synthèse, et l'objectif du jour 4."),
      ]),
    seance("Jour 4 — Améliorer son score",
      "À la fin de cette séance, les élèves sauront lire la grille plus vite et plus juste qu'au début de la semaine.",
      15, [ph("En autonomie", "15 min", "Chacun cherche à améliorer son score.")]),
  ],
};

// ── CP et CE1 : la prosodie ──────────────────────────────────────────────

const PROSODIE_CP: Demarche = {
  id: "prosodie-cp",
  nom: "Lire à voix haute : le phrasé et l'expressivité, en ateliers (CP)",
  famille: "Français",
  source: `${LIVRET("CP", 1, "Acquérir le décodage et l'encodage des CGP et entrer dans la lecture à voix haute")}, focus 2`,
  resume: "Le second focus du livret CP, à partir de la période 2, pour les élèves qui lisent plus de 30 mots par minute : lire des phrases de plus en plus vite en respectant la ponctuation, les liaisons, les groupes de sens, sans s'interrompre à la ligne ; puis avec l'expressivité que le sens demande. Une semaine : un atelier guidé, un entraînement en binôme, un atelier d'évaluation et un nouveau texte, un binôme encore.",
  seances: [
    seance("Jour 1 — Atelier guidé",
      "À la fin de cette séance, les élèves sauront lire des phrases en respectant ce qu'on travaille : les liaisons, les pauses entre les groupes de souffle, l'articulation.",
      20, [
        ph(T1, "5 min", "Le rappel des apprentissages ; le professeur lit les phrases ou le texte en accentuant ce qu'on travaille : les liaisons, les pauses entre les groupes de souffle, une articulation exagérée."),
        ph(T2, "10 min", "Chacun lit seul des phrases, ou un texte déjà travaillé en compréhension ; plusieurs élèves lisent à voix haute, chaque lecture est commentée ; une mise en commun, et une trace en dictée à l'adulte — sur les liaisons, par exemple."),
        ph(T3, "5 min", "« Qu'avez-vous appris aujourd'hui ? » La relecture en binôme du lendemain."),
      ]),
    seance("Jour 2 — En binôme",
      "À la fin de cette séance, les élèves sauront évaluer la lecture d'un camarade avec les critères du phrasé.",
      15, [ph("En autonomie", "15 min", "Un lecteur, un auditeur-évaluateur, avec les critères et un codage du phrasé.")]),
    seance("Jour 3 — Atelier guidé : évaluer, puis un nouveau texte",
      "À la fin de cette séance, les élèves sauront où ils en sont, et découvriront un nouveau texte à lire.",
      20, [
        ph(T2, "15 min", "L'évaluation formative de chaque dimension du phrasé — la ponctuation, les groupes de souffle, les liaisons, le retour à la ligne, le ton et le rythme —, puis de l'expressivité, sur une grille simple : « pas encore », « parfois », « excellent ». Puis un nouveau texte, découvert comme au jour 1."),
        ph(T3, "5 min", "Ce qu'on a appris, et la relecture en binôme du lendemain."),
      ]),
    seance("Jour 4 — En binôme",
      "À la fin de cette séance, les élèves sauront lire le nouveau texte avec un phrasé plus sûr.",
      15, [ph("En autonomie", "15 min", "Comme au jour 2 : un lecteur, un auditeur-évaluateur.")]),
  ],
};

const PROSODIE_CE1: Demarche = {
  id: "prosodie-ce1",
  nom: "Lire à voix haute : la prosodie, en ateliers (CE1)",
  famille: "Français",
  source: `${LIVRET("CE1", 1, "De l'identification des mots à la lecture prosodique de phrases")}, focus 2`,
  resume: "Le second focus du livret CE1, dès la période 1, pour les élèves qui lisent plus de 40 mots par minute : chaque semaine un objectif de phrasé, dans cet ordre — les liaisons ; articuler ; la ponctuation et son rôle ; l'intonation ; une phrase écrite sur plusieurs lignes ; les groupes de souffle ; des textes variés ; l'expressivité —, un texte travaillé quatre jours. Fin de CE1 : 70 mots par minute.",
  seances: [
    seance("Jour 1 — Préparer le texte",
      "À la fin de cette séance, les élèves sauront lire en autonomie le texte du jour, ou celui du lendemain.",
      15, [ph("En autonomie", "15 min", "Les groupes 3 et 4 lisent en autonomie ; le groupe 2 prépare en avance le support du jour 2.")]),
    seance("Jour 2 — Atelier guidé : les liaisons",
      "À la fin de cette séance, les élèves sauront repérer où faire une liaison, et la faire en lisant.",
      20, [
        ph(T1, "5 min", "Le rappel ; l'objectif : « Aujourd'hui, nous allons apprendre à repérer quand il faut faire une liaison. » Le professeur lit sans liaisons « Le petit éléphant a un gros appétit. » ; les élèves réagissent ; les liaisons sont montrées et expliquées."),
        ph(T2, "10 min", "Des lectures individuelles puis successives ; la liaison en /n/ repérée sur une grille « J'entends /n/ ». Puis un nouveau texte, travaillé chaque jour pendant quatre jours : des phrases choisies pour le groupe 2, le texte entier pour les groupes 3 et 4, l'expressivité en plus pour le groupe 4."),
        ph(T3, "5 min", "« Comment fait-on pour bien lire ? Qu'avons-nous appris ? » La trace écrite en dictée à l'adulte ; les grilles des liaisons en /t/ et en /z/ ; l'entraînement en binôme du lendemain."),
      ]),
    seance("Jour 3 — En binôme",
      "À la fin de cette séance, les élèves sauront évaluer la lecture d'un camarade avec des critères et un codage.",
      15, [ph("En autonomie", "15 min", "Les groupes 3 et 4 : un lecteur, un auditeur-évaluateur, avec des critères et un codage du texte.")]),
    seance("Jour 4 — Atelier guidé : évaluer, conseiller",
      "À la fin de cette séance, les élèves sauront ce qu'ils réussissent dans leur lecture, et ce qu'il leur reste à travailler.",
      20, [
        ph(T2, "15 min", "Une évaluation intermédiaire de chaque dimension de la prosodie, puis de l'expressivité, sur une grille simple : « pas encore », « parfois », « excellent » ; de nouveaux conseils."),
        ph(T3, "5 min", "La semaine suivante reprend la même démarche avec l'objectif suivant : articuler, la ponctuation, l'intonation…"),
      ]),
  ],
};

// ── L'écriture cursive et la copie ───────────────────────────────────────

const CURSIVE: Demarche = {
  id: "ecriture-cursive",
  nom: "Écrire en cursive : le geste, chaque jour (CP-CE1)",
  famille: "Français",
  source: `${LIVRET("CP", 2, "Apprendre à écrire en écriture cursive")}, focus 1`,
  resume: "La séquence du livret CP, dès la période 1 et toute l'année : des séances quotidiennes de 10 à 15 minutes, en petits groupes, construites sur deux jours au fil de la progression en décodage — la lettre tracée par le professeur en verbalisant, formée à vide puis sur l'ardoise, puis sur le cahier ; puis enchaînée dans des syllabes, des mots, des phrases, en levant le moins possible le crayon. Les réglures se resserrent : 3, puis 2,5, puis 2 mm. Au CE1, les majuscules cursives, par familles de gestes.",
  seances: [
    seance("Jour 1 — Tracer la lettre",
      "À la fin de cette séance, les élèves sauront tracer la lettre du jour en cursive, avec le bon geste.",
      15, [
        ph(T1, "4 min", "En période 1, un rituel de motricité fine. L'objectif — tracer la lettre « a » et la relier, par exemple — et les points de vigilance ; le professeur trace plusieurs fois au tableau en verbalisant."),
        ph(T2, "4 min", "Les élèves forment la lettre à vide avec le doigt, puis sur l'ardoise, en verbalisant le geste."),
        ph(T3, "7 min", "Sur le cahier : l'assise, la posture, la tenue du crayon ; on vocalise à voix basse ; on compare sa production au modèle en entourant ses réussites.",
          "Reprends les tenues de crayon qui posent problème ; un crayon à trois faces, un guide-doigts, un stylo roller, des lettres rugueuses pour qui en a besoin."),
      ]),
    seance("Jour 2 — Enchaîner : syllabes, mots, phrases",
      "À la fin de cette séance, les élèves sauront enchaîner la lettre du jour avec d'autres, dans des syllabes, des mots, une phrase.",
      15, [
        ph(T1, "3 min", "La lettre de la veille, rappelée et tracée."),
        ph(T2, "5 min", "Le professeur modélise les syllabes, les mots, les phrases, et les liaisons entre les lettres."),
        ph(T3, "7 min", "Sur le cahier, en levant le moins possible le crayon ; on compare au modèle."),
      ]),
    seance("Transcrire du script à la cursive",
      "À la fin de cette séance, les élèves sauront transcrire en cursive des mots ou des phrases écrits en script.",
      15, [ph(T4, "15 min", "Plusieurs fois par semaine, dès la période 1 : des mots ou des phrases à transcrire de l'écriture script vers l'écriture cursive.")]),
  ],
};

const COPIE: Demarche = {
  id: "strategies-de-copie",
  nom: "Copier : des stratégies pour ne plus copier lettre à lettre (CP-CE2)",
  famille: "Français",
  source: `${LIVRET("CP", 2, "Apprendre à écrire en écriture cursive")}, focus 2`,
  resume: "Le second focus du livret CP, à partir de la période 2, plusieurs fois par semaine : copier vite et sans erreur un modèle qu'on a lu, en le découpant en empans qu'on retient — un groupe de syllabes, de mots —, en repérant les difficultés — le passage du script à la cursive, l'orthographe —, en respectant la présentation. Une puis deux ou trois phrases. Repère : en une minute, une phrase d'environ 15 lettres en milieu de CP, 30 au CE1, 50 au CE2.",
  seances: [
    seance("Copier une phrase : la stratégie",
      "À la fin de cette séance, les élèves sauront copier une phrase en la découpant en empans, en revenant peu au modèle.",
      15, [
        ph(T1, "5 min", "L'objectif : copier rapidement et sans erreur la phrase du tableau — « Il lit un petit livre. » La faire lire et relire ; repérer les difficultés graphiques et orthographiques ; le professeur montre une stratégie de copie en la disant à voix haute (le mot « petit »)."),
        ph(T2, "5 min", "La copie sur le cahier ; le modèle s'éloigne — au fond de la classe — pour limiter les retours, que l'on compte.",
          "Adapte la distance au modèle ; prépare les empans avec les élèves qui en ont besoin."),
        ph(T3, "5 min", "Relecture, puis vérification en binôme ; un retour collectif : le nombre de retours au modèle, le nombre d'erreurs."),
      ]),
    seance("S'entraîner à copier",
      "À la fin de cette séance, les élèves sauront copier une nouvelle phrase avec moins de retours au modèle.",
      15, [
        ph(T1, "4 min", "Une nouvelle phrase, lue et relue ; ses difficultés repérées ; les empans dits."),
        ph(T2, "6 min", "La copie, le modèle éloigné ; chacun compte ses retours."),
        ph(T3, "5 min", "Relecture, vérification en binôme ; chacun compare au jour précédent."),
      ]),
    seance("Copier deux ou trois phrases",
      "À la fin de cette séance, les élèves sauront copier deux ou trois phrases sans erreur et de façon lisible.",
      15, [
        ph(T2, "10 min", "Le même déroulement avec deux ou trois phrases, en respectant les sauts de ligne et la ponctuation."),
        ph(T4, "5 min", "Au fil de l'année : trois ou quatre phrases en fin de CP ; au CE1, quatre à cinq phrases courtes, puis une dizaine de lignes."),
      ]),
  ],
};

// ── Le vocabulaire ───────────────────────────────────────────────────────

/** La catégorisation des livrets : un classement amorcé au tableau, puis par trinômes, puis débattu. */
const categoriser = (exemples: string, classement: string, institutionnaliser: string, duree: 45 | 55): PhaseCadre[] => [
  ph(T1, duree === 55 ? "15 min" : "10 min", `Ce qu'on étudie en vocabulaire : « Je réfléchis au sens des mots. J'observe comment ils sont fabriqués. » Les mots sur des étiquettes — ${exemples} — ; un élève amorce un classement au tableau et le justifie ; la classe valide ou non.`),
  ph(T2, "20 min", `Par trinômes, une enveloppe avec le même jeu d'étiquettes : un classement justifié — ${classement}. Un classement par nombre de lettres ou par initiale n'est pas validé : il ne porte ni sur le sens ni sur la forme des mots.`,
    "Des groupes selon le degré d'acquisition ; un nombre de mots adapté ; des images pour les non-décodeurs."),
  ph(T3, duree === 55 ? "20 min" : "15 min", institutionnaliser),
];

const VOCABULAIRE_CP: Demarche = {
  id: "vocabulaire-cp",
  nom: "Enrichir son vocabulaire : collecter, catégoriser, réactiver (CP)",
  famille: "Français",
  source: LIVRET("CP", 3, "Enrichir son vocabulaire dans toutes les disciplines"),
  resume: "La séquence du livret CP, en lien avec une séquence d'EPS sur la course : les mots rencontrés en contexte, collectés, puis catégorisés — ici par familles de mots : courir, la course, un coureur — et réactivés par des jeux, tout au long de l'année, en espaçant les rappels. Quatre réseaux de mots par période.",
  seances: [
    seance("Rencontrer les mots en contexte",
      "À la fin de cette séance, les élèves sauront reconnaître et employer, à l'oral, les mots de la course entendus pendant l'EPS.",
      20, [ph("Pendant l'EPS", "20 min", "Pendant la séquence d'EPS autour de la course, les élèves entendent une partie du corpus visé : courir, accélérer, un chronomètre, l'endurance…")]),
    seance("Collecter",
      "À la fin de cette séance, les élèves sauront dire des mots qui vont avec « course ».",
      20, [ph("La collecte", "20 min", "« Si je vous dis le mot course, est-ce que cela vous fait penser à d'autres mots ? » Les mots sont écrits, puis imprimés sur des étiquettes.")]),
    seance("Catégoriser : les familles de mots",
      "À la fin de cette séance, les élèves sauront classer des mots par familles et justifier leur classement : courir, la course, un coureur.",
      55, categoriser("courir, ralentir, la course, l'arrivée…", "courir, course, coureur",
        "Les classements sont comparés ; un débat aboutit à un classement commun. On dit que courir, course et coureur sont des mots de la même famille : ils parlent de la même chose et ont des lettres en commun. La trace écrite : les familles de mots — courir, la course, une coureuse, un parcours ; la rapidité, rapide, rapidement…", 55)),
    seance("Institutionnaliser",
      "À la fin de cette séance, les élèves sauront dire ce qu'est une famille de mots, et en donner des exemples.",
      20, [ph(T3, "20 min", "Si le temps 3 a été différé : le classement commun, la notion de famille de mots, la trace écrite des familles.")]),
    seance("Présenter les jeux",
      "À la fin de cette séance, les élèves sauront jouer aux jeux qui font manipuler les mots du corpus.",
      30, [ph("Les jeux, par groupes", "30 min", "Des jeux différenciés : nommer les mots et les employer dans une phrase — loto, memory, jeu de l'oie, jeu de Kim — pour les non-décodeurs ; un jeu des sept familles et une phrase avec des mots d'une même famille pour les petits décodeurs ; lire vite les mots dans des listes et des textes, puis les écrire, pour les autres.")]),
    seance("Ateliers de jeux (1)",
      "À la fin de cette séance, les élèves sauront réemployer le vocabulaire de la course, à l'oral et à l'écrit.",
      25, [ph("Ateliers", "25 min", "Les jeux par groupes, pour réutiliser le vocabulaire enseigné.")]),
    seance("Ateliers de jeux (2)",
      "À la fin de cette séance, les élèves sauront réemployer ces mots dans une phrase, et en retenir l'orthographe.",
      25, [
        ph("Ateliers", "20 min", "Les mêmes ateliers, en tournant."),
        ph(T4, "5 min", "Ensuite, toute l'année, des rappels de plus en plus espacés ; une phrase pour raconter une course, la fable Le lièvre et la tortue."),
      ]),
  ],
};

const VOCABULAIRE_CE1: Demarche = {
  id: "vocabulaire-ce1",
  nom: "Enrichir son vocabulaire : l'alimentation, les mots génériques (CE1)",
  famille: "Français",
  source: LIVRET("CE1", 2, "Enrichir son vocabulaire dans toutes les disciplines"),
  resume: "La séquence du livret CE1, en lien avec une séquence de questionner le monde sur l'équilibre alimentaire : les mots rencontrés en contexte, collectés, catégorisés par termes génériques — repas, plats cuisinés, les sept familles d'aliments, actions, mots pour décrire —, puis réemployés à l'oral et à l'écrit. Une vingtaine de mots à catégoriser ; cinq réseaux par période.",
  seances: [
    seance("Rencontrer les mots en contexte",
      "À la fin de cette séance, les élèves sauront reconnaître les mots de l'alimentation rencontrés en sciences.",
      30, [ph("En sciences", "30 min", "Pendant la séquence de questionner le monde sur l'équilibre alimentaire : des verbes — équilibrer, alléger, enrichir, composer, élaborer… — ; des noms de repas, de plats, des familles d'aliments ; des adjectifs — savoureux, copieux, frugal… — ; des expressions — « manger comme quatre », « avoir un appétit d'oiseau ».")]),
    seance("Collecter",
      "À la fin de cette séance, les élèves sauront dire des mots qui vont avec « repas équilibré ».",
      20, [ph("La collecte", "20 min", "« Si je vous dis les mots repas équilibré, à quoi cela vous fait-il penser ? » Les mots, sur des étiquettes.")]),
    seance("Catégoriser : les mots génériques",
      "À la fin de cette séance, les élèves sauront ranger des mots sous un terme générique — les repas, les familles d'aliments… — et justifier leur classement.",
      45, categoriser("faisselle, endives, cabillaud, petit-déjeuner, équilibrer, copieux… ; des mots qui ont plusieurs sens (un repas riche), d'autres qui vont dans deux catégories (le beurre)",
        "ce que l'on fait, les familles d'aliments, les noms de repas…",
        "Les classements sont comparés ; un débat aboutit à un classement commun ; le professeur fixe les termes génériques visés — les repas, les plats cuisinés, les sept familles d'aliments, les actions, les mots pour décrire —, qui donnent un référentiel collectif.", 45)),
    seance("Institutionnaliser et enrichir",
      "À la fin de cette séance, les élèves sauront retrouver dans le référentiel les mots de chaque catégorie, et en ajouter.",
      20, [ph(T3, "20 min", "Le référentiel collectif s'enrichit d'expressions et de mots nouveaux ; il suivra la classe au niveau suivant.")]),
    seance("Jouer avec les mots",
      "À la fin de cette séance, les élèves sauront retrouver vite les mots du corpus et les écrire.",
      30, [ph("Des jeux", "30 min", "Des jeux pour rebrasser le vocabulaire : le loto, le jeu de piste, la fluence de mots, la mémorisation de leur orthographe — comme au CP.")]),
    seance("Transfert à l'oral : présenter un repas équilibré",
      "À la fin de cette séance, les élèves sauront présenter un repas équilibré en employant le vocabulaire appris.",
      45, [
        ph(T1, "10 min", "Le projet de la Semaine du goût ; le vocabulaire réactivé avec le référentiel."),
        ph(T2, "20 min", "« Présentez en 3 minutes un repas équilibré, que vous aurez imaginé, en utilisant le vocabulaire appris. » En trinômes ; un atelier guidé pour les élèves les moins à l'aise à l'oral."),
        ph(T3, "15 min", "Chaque trinôme présente son repas ; les autres l'évaluent : le vocabulaire, l'équilibre."),
      ]),
    seance("Transfert à l'écrit : un menu pour la cantine",
      "À la fin de cette séance, les élèves sauront rédiger un menu équilibré avec les mots appris.",
      45, [
        ph(T1, "10 min", "Un menu type, lu — entrée, plat, dessert ; les sept familles d'aliments rappelées."),
        ph(T2, "25 min", "« Rédige un menu équilibré à proposer pour la restauration scolaire. » Seul puis en binôme ; un atelier guidé pour les moins à l'aise à l'écrit."),
        ph(T3, "10 min", "Les binômes recopient au propre ; on met en commun avant l'envoi à la restauration scolaire."),
      ]),
  ],
};

const VOCABULAIRE_CE2: Demarche = {
  id: "vocabulaire-ce2",
  nom: "Enseigner le vocabulaire : le bleu, en arts visuels (CE2)",
  famille: "Français",
  source: LIVRET("CE2", 2, "Enseigner le vocabulaire au CE2"),
  resume: "La séquence du livret CE2, en lien avec une séquence d'arts visuels sur la couleur bleue — La nuit étoilée de Van Gogh, La grande vague d'Hokusai, Peinture bleue de Kandinsky — pour créer un nuancier : les mots rencontrés, collectés, catégorisés — actions, outils, médiums, supports, nuances, émotions —, puis réutilisés en ateliers et en rituels. De 15 à 20 mots enseignés ; six réseaux par période.",
  seances: [
    seance("Rencontrer les mots en contexte",
      "À la fin de cette séance, les élèves sauront reconnaître les mots de la peinture et des nuances de bleu rencontrés en arts visuels.",
      45, [ph("En arts visuels", "45 min", "Pendant la séquence d'arts visuels : les couleurs primaires et secondaires, chaudes et froides ; les gestes — badigeonner, asperger… — ; les outils, les médiums, les supports ; les nuances de bleu — outremer, cobalt, indigo, cyan… — ; les émotions.")]),
    seance("Collecter",
      "À la fin de cette séance, les élèves sauront dire les mots qu'ils ont employés en arts visuels.",
      20, [ph("La collecte", "20 min", "Les élèves citent les mots utilisés en arts visuels ; le professeur les reporte sur des étiquettes, un jeu pour trois élèves.")]),
    seance("Catégoriser",
      "À la fin de cette séance, les élèves sauront ranger les mots du corpus en catégories — actions, outils, médiums, supports, nuances — et nommer ces catégories.",
      45, categoriser("turquoise, outremer, asperger, toile, pinceau, gouache…", "verbes et actions, nuances de bleu, supports, outils, médiums, catégories de couleurs",
        "Les classements sont comparés ; un débat aboutit à un classement commun, validé sur des critères de sens ou de forme ; le lien est fait avec d'autres connaissances — les nuances de rouge, de vert.", 45)),
    seance("Institutionnaliser et enrichir",
      "À la fin de cette séance, les élèves sauront nommer les catégories et donner des mots de chacune.",
      20, [ph(T3, "20 min", "Les noms des catégories et des exemples de mots de chacune ; le corpus s'enrichit.")]),
    seance("Rebrasser le vocabulaire",
      "À la fin de cette séance, les élèves sauront retrouver vite les mots étudiés.",
      20, [ph("Entraînement", "20 min", "Une séance pour rebrasser le vocabulaire étudié ; puis des rituels, à l'oral et à l'écrit : devinettes, défis, gammes d'écriture.")]),
    seance("Réutiliser : trois ateliers (1)",
      "À la fin de cette séance, les élèves sauront employer les mots étudiés dans une phrase, et nommer les nuances de bleu.",
      30, [ph("Ateliers", "30 min", "Produire une ou plusieurs phrases, à l'oral ou à l'écrit ; reconnaître et nommer les nuances de bleu ; associer le mot à la nuance.")]),
    seance("Réutiliser : trois ateliers (2)",
      "À la fin de cette séance, les élèves sauront réemployer les mots étudiés, et quelques expressions avec « bleu ».",
      30, [
        ph("Ateliers", "25 min", "Les mêmes ateliers, en tournant ; le corpus s'enrichit d'expressions — « avoir une peur bleue »… — et de styles de peinture."),
        ph(T4, "5 min", "Ensuite : un haïku, la description d'un tableau, sa présentation à l'oral."),
      ]),
  ],
};

// ── CE2 : lire une fable pour montrer qu'on l'a comprise ─────────────────

const FABLE_CE2: Demarche = {
  id: "lecture-expressive-ce2",
  nom: "Lire à voix haute pour montrer qu'on a compris : une fable (CE2)",
  famille: "Français",
  source: LIVRET("CE2", 1, "Lecture : enseigner la fluence à visée expressive"),
  resume: "La séquence du livret CE2 : après une séquence de compréhension de la fable « La Grenouille qui se veut faire aussi grosse que le Bœuf », on prépare sa mise en voix — repérer les effets, s'appuyer sur la ponctuation, la syntaxe, le sens —, on s'entraîne à plusieurs voix, on la lit à la classe ; le groupe 1 la récite. Chaque semaine, des entraînements différenciés : précision et vitesse, phrasé, expressivité. Fin de CE2 : 90 mots par minute.",
  seances: [
    seance("Préparer la mise en voix : repérer les effets",
      "À la fin de cette séance, les élèves sauront relier un effet de lecture à ce qui le permet dans le texte — la ponctuation, la syntaxe, le sens —, et le dire.",
      75, [
        ph(T1, "15 min", "Les objectifs et le contexte ; le lexique rappelé (nenni, chétive pécore) ; une lecture modèle ; les premières impressions ; ce qu'est une fable, et ses effets : l'humour, l'absurde, la morale."),
        ph(T2, "45 min", "Le groupe 2 travaille les personnages et le dialogue (vers 6 à 9), soulignés de deux couleurs, puis une lecture à trois voix ; les groupes 3 et 4, la langue : le caractère de la Grenouille (vers 2-3), « creva » (vers 10-11), la morale et la répétition de « Tout » (vers 12-15). Puis une lecture dialoguée par quatre élèves et de nouvelles lectures par groupes de quatre, évaluées : l'articulation, les liaisons, le phrasé, la ponctuation, l'expressivité, le débit, l'auditoire."),
        ph(T3, "15 min", "Chacun repart avec un « texte partition » : le texte et ses indications de lecture."),
      ]),
    seance("S'entraîner à plusieurs voix",
      "À la fin de cette séance, les élèves sauront lire leur rôle de la fable avec l'intonation qui montre ce qu'ils ont compris.",
      30, [
        ph(T1, "10 min", "Le texte partition rappelé, et l'objectif : lire la fable à la classe — ou la réciter, pour le groupe 1. Une lecture modèle avec des élèves, commentée ; des critères simples : la puissance et l'envie de la Grenouille, la circonspection de son amie, la moquerie du fabuliste ; le rythme, les silences, la montée en puissance."),
        ph(T2, "20 min", "En petits groupes, les rôles se répartissent — la Grenouille, son amie, le narrateur, le fabuliste — : en atelier semi-guidé, pour reproduire les intonations, ou en autonomie, pour une interprétation personnelle.",
          "Soutiens surtout les groupes 1 et 2 ; un élève peut lire toute la fable ; le texte partition se partage."),
      ]),
    seance("Lire la fable à la classe",
      "À la fin de cette séance, les élèves sauront lire — ou réciter — la fable devant la classe en montrant qu'ils l'ont comprise.",
      30, [
        ph("Lectures et récitations", "25 min", "Les groupes 2, 3 et 4 lisent la fable à la classe ; le groupe 1 en récite des passages par cœur, avec les mêmes critères."),
        ph("Évaluation", "5 min", "Sur la grille des critères de réussite."),
      ]),
    seance("D'autres fables",
      "À la fin de cette séance, les élèves sauront lire avec expression une autre fable, à la manière de la première.",
      30, [ph(T4, "30 min", "Quelques séances par période : la fluence évaluée sur la même fable, puis sur d'autres — d'Ésope, de Phèdre, de La Fontaine.")]),
    seance("Entraînements de la semaine, en groupes de besoin",
      "À la fin de cette séance, les élèves sauront lire plus vite, avec un meilleur phrasé ou plus d'expression, selon leur groupe.",
      30, [ph(T4, "30 min", "Quatre jours, une trentaine de minutes : la précision et la vitesse pour le groupe 1 (moins de 30 mots par minute), sur des supports des livrets CP et CE1 ; le phrasé sur les phrases dialoguées pour le groupe 2 (30 à 70) ; l'expressivité pour les groupes 3 et 4 (plus de 70).")]),
  ],
};

export const DEMARCHES_FRANCAIS: Demarche[] = [
  CGP_CP, PRECISION_CP, PROSODIE_CP, PRECISION_CE1, PROSODIE_CE1, CURSIVE, COPIE, VOCABULAIRE_CP, VOCABULAIRE_CE1, VOCABULAIRE_CE2, FABLE_CE2,
];

/**
 * La séquence d'un livret de français pour une compétence, à sa classe ; rien
 * sinon. Tout est en minuscules sans accents : `cg` est la compétence générale
 * (« identifier les mots de maniere de plus en plus aisee »), `sd` le
 * sous-domaine (« lecture », « vocabulaire »…).
 */
export function demarcheDuLivretDeFrancais(classe: string, sd: string, cg: string, comp: string): string | null {
  if (/identifier les mots/.test(cg)) {
    if (classe === "cp") return /mots par minute/.test(comp) ? "precision-vitesse-cp" : "cgp-deux-jours-cp";
    return classe === "ce1" || classe === "ce2" ? "precision-vitesse-ce1" : null;
  }
  if (/lire a voix haute/.test(cg)) {
    if (classe === "cp") return /oraliser les syllabes/.test(comp) ? "cgp-deux-jours-cp"
      : /oraliser regulierement|textes dechiffrables/.test(comp) ? "precision-vitesse-cp" : "prosodie-cp";
    return classe === "ce1" ? "prosodie-ce1" : classe === "ce2" ? "lecture-expressive-ce2" : null;
  }
  if (/encoder puis ecrire sous dictee/.test(cg)) return classe === "cp" ? "cgp-deux-jours-cp" : null;
  if (/ecriture cursive/.test(cg)) return "ecriture-cursive";
  if (/strategies de copie/.test(cg)) return "strategies-de-copie";
  if (/vocabulaire/.test(sd) && !/orthographe des mots/.test(cg)) {
    return classe === "cp" ? "vocabulaire-cp" : classe === "ce1" ? "vocabulaire-ce1" : classe === "ce2" ? "vocabulaire-ce2" : null;
  }
  return null;
}
