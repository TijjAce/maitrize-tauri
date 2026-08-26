// Schémas des dispositifs d'accompagnement (PAP, PAI, PPRE, PPS).
//
// Chaque dispositif est décrit en données plutôt qu'en code : un écran
// générique sait afficher, enregistrer et imprimer n'importe lequel. Ajouter
// un dispositif ou un item ne demande donc pas de nouveau composant.
//
// Le PAP reprend les intitulés du formulaire national annexé à la circulaire
// n° 2015-016 du 22 janvier 2015 (parties maternelle et élémentaire).

export type Champ =
  | { t: "ligne"; id: string; label: string; large?: boolean }
  | { t: "zone"; id: string; label: string; min?: number }
  | { t: "grille"; id: string; label: string; colonnes: string[]; items: string[] }
  | { t: "liste"; id: string; label: string; colonnes: string[]; lignes: number };

export interface SectionD { titre: string; note?: string; champs: Champ[] }
export interface Dispositif {
  id: string; nom: string; nomLong: string; sousTitre: string;
  reference?: string; sections: SectionD[];
}

const NIV_MAT = ["PS", "MS", "GS"];
const NIV_ELEM = ["CP", "CE1", "CE2", "CM1", "CM2"];

// ── PAP ───────────────────────────────────────────────────────────────────
const PAP: Dispositif = {
  id: "pap", nom: "PAP", nomLong: "Plan d'accompagnement personnalisé",
  sousTitre: "Élève dont les difficultés scolaires durables résultent d'un trouble des apprentissages",
  reference: "Circulaire n° 2015-016 du 22 janvier 2015",
  sections: [
    {
      titre: "Identification",
      champs: [
        { t: "ligne", id: "responsables", label: "Responsables légaux", large: true },
        { t: "ligne", id: "adresse", label: "Adresse", large: true },
        { t: "ligne", id: "etablissement", label: "École / établissement" },
        { t: "ligne", id: "classe", label: "Classe" },
        { t: "ligne", id: "anneeScolaire", label: "Année scolaire" },
      ],
    },
    {
      titre: "Besoins spécifiques de l'élève",
      note: "À remplir par le médecin de l'Éducation nationale.",
      champs: [
        { t: "zone", id: "pointsAppui", label: "Points d'appui pour les apprentissages", min: 90 },
        { t: "zone", id: "consequences", label: "Conséquences des troubles sur les apprentissages", min: 90 },
      ],
    },
    {
      titre: "Maternelle — conduite de classe : points d'attention",
      note: "Seuls les items indispensables à l'élève sont à cocher.",
      champs: [
        { t: "grille", id: "matOrga", label: "Organisation spatiale, temporelle et matérielle", colonnes: NIV_MAT, items: [
          "Veiller à la bonne installation de l'élève dans la classe en fonction des temps d'activités",
          "Visibilité et clarté des affichages",
          "Mise à disposition d'outils individuels et adaptés",
          "Aides visuelles pour la gestion du temps",
        ] },
        { t: "grille", id: "matTaches", label: "Réalisation des tâches et aménagement des supports", colonnes: NIV_MAT, items: [
          "Aider à la compréhension des consignes et des informations (reformulation, …)",
          "Décomposer les consignes et informations complexes (utiliser de préférence des consignes simples)",
          "Adapter et aménager les supports",
          "Faciliter la préhension",
          "Finaliser et faire évoluer le plan de travail et les aménagements avec l'enfant",
        ] },
        { t: "grille", id: "matAide", label: "Aider l'élève dans la classe", colonnes: NIV_MAT, items: [
          "Accepter des modes d'expression spécifiques de l'élève (mots, gestes...)",
          "Mettre en place des dispositifs de coopération entre élèves",
          "Prendre en compte les contraintes associées : fatigue, lenteur, surcharge… (accepter de différer le travail)",
          "Utiliser différents canaux dans les différentes activités (expression, psychomotricité …)",
        ] },
        { t: "zone", id: "matAmenagements", label: "Aménagements mis en place (PS / MS / GS)", min: 80 },
      ],
    },
    {
      titre: "Élémentaire — adaptations et aménagements",
      note: "Seuls les items indispensables à l'élève sont à cocher.",
      champs: [
        { t: "grille", id: "elemTransv", label: "Adaptations transversales", colonnes: NIV_ELEM, items: [
          "Installer l'élève face au tableau",
          "Veiller à la lisibilité et à la clarté de l'affichage",
          "Utiliser un code couleur par matière",
          "Privilégier l'agenda au cahier de textes",
          "Vérifier que l'agenda soit lisiblement renseigné",
          "Agrandir les formats des supports écrits (A3)",
          "Donner des supports de travail ou d'exercices déjà écrits (QCM par exemple)",
          "Fournir des photocopies pour privilégier l'apprentissage et le sens donné",
          "Surligner les énoncés ; surligner une ligne sur deux",
          "Proposer à l'élève des outils d'aide (cache, règle...)",
          "Fournir à l'élève des moyens mnémotechniques",
          "S'assurer de la compréhension du vocabulaire spécifique",
          "Aider à la compréhension par une explicitation ou une reformulation de la part de l'enseignant",
          "Mettre en place un tutorat par l'intermédiaire d'un élève qui lit à voix haute les consignes",
          "Énoncer l'objectif de la séance et en faire une synthèse à la fin",
          "Proposer des activités qui pourront être achevées avec succès, qui valoriseront l'élève",
          "Autoriser l'utilisation d'une calculatrice simple (permettant les quatre opérations) dans toutes les disciplines",
        ] },
        { t: "grille", id: "elemInfo", label: "Utilisation de l'informatique", colonnes: NIV_ELEM, items: [
          "Permettre l'utilisation de l'ordinateur et de la tablette",
          "Permettre l'utilisation d'une clef USB",
          "Permettre l'utilisation de logiciel ou d'application spécifique",
          "Permettre à l'élève d'imprimer ses productions",
        ] },
        { t: "grille", id: "elemEval", label: "Évaluations", colonnes: NIV_ELEM, items: [
          "Accorder un temps majoré",
          "Donner les consignes à l'oral",
          "Adapter la situation et les supports de l'évaluation de façon à limiter l'écrit (QCM, schémas à légender, exercices à trous, à cocher, à relier)",
          "Autoriser différents supports (tables de calcul, fiches chronologiques, fiches mémoire)",
          "Privilégier les évaluations sur le mode oral",
          "N'évaluer l'orthographe que si c'est l'objet de l'évaluation",
          "Ne pas pénaliser le soin, l'écriture, la réalisation de figures…",
          "Évaluer les progrès pour encourager les réussites",
        ] },
        { t: "grille", id: "elemLecons", label: "Leçons", colonnes: NIV_ELEM, items: [
          "Proposer l'apprentissage des mots clés uniquement",
          "Fournir une fiche « mémoire » (dessins, symboles...)",
        ] },
        { t: "grille", id: "elemLecture", label: "Lecture / langage oral", colonnes: NIV_ELEM, items: [
          "Recourir de manière privilégiée à des jeux proposant un travail de la conscience phonologique",
          "Accentuer le travail sur la combinatoire",
          "Avant même de lire le texte, lire les questions qui seront posées afin de faciliter la prise d'indices",
          "Proposer une lecture oralisée (enseignant ou autre élève) ou une écoute audio des textes supports",
          "Surligner des mots clés / passages importants pour faciliter la lecture",
          "Proposer un schéma chronologique du récit (indiquer ce qu'il a retenu, paragraphe après paragraphe)",
        ] },
        { t: "grille", id: "elemEcrits", label: "Production d'écrits", colonnes: NIV_ELEM, items: [
          "Simplifier les règles en introduisant des indices visuels (pictogrammes, croquis en plus du texte)",
          "Adapter les quantités d'écrit (dictée à trous, à choix...)",
          "Privilégier l'apprentissage des mots en passant par l'oral (épeler, faire le geste dans l'espace) et non par la copie",
          "Limiter les exigences sur l'emploi de règles précises",
          "Recourir à la dictée à l'enseignant",
          "Diminuer la quantité d'écrit sur chaque feuille",
        ] },
        { t: "grille", id: "elemMaths", label: "Mathématiques", colonnes: NIV_ELEM, items: [
          "Autoriser l'utilisation des tables de multiplication (ou de la calculatrice) pendant les cours et les contrôles",
          "Privilégier la présentation des calculs en ligne",
          "Présenter les calculs en colonnes avec des repères de couleur (unités, dizaines, centaines)",
          "Admettre que la réponse ne soit pas rédigée si les calculs sont justes",
          "Ne pas sanctionner les tracés en géométrie",
          "Laisser compter sur les doigts",
          "Utiliser la manipulation (pliages, objets 3D…)",
          "Travailler sur les « qui… qui » (qui est perpendiculaire à… et qui passe…) et les syllogismes",
          "Colorier les différentes colonnes des tableaux à double entrée",
          "Favoriser, autoriser la résolution des problèmes avec recours à la schématisation",
        ] },
        { t: "grille", id: "elemLangue", label: "Pratique d'une langue vivante étrangère", colonnes: NIV_ELEM, items: [
          "Veiller à ce que la perception de départ soit correcte : prononcer distinctement, pas trop vite, écrire en gros caractères",
          "Travailler la prononciation des sons même exagérément",
          "Utiliser un enseignement multisensoriel : entendre, lire, voir (images), écrire",
          "Grouper les mots par similitude orthographique / phonologique, faire des listes",
          "Utiliser des couleurs pour segmenter les mots, les phrases",
          "Expliquer et traduire la grammaire, les tournures de phrases",
        ] },
        { t: "zone", id: "elemAutres", label: "Autres aménagements et adaptations", min: 80 },
      ],
    },
    {
      titre: "Bilan des aides apportées",
      champs: [
        { t: "zone", id: "bilanNonAtteints", label: "Aménagements n'ayant pas atteint les objectifs escomptés", min: 90 },
        { t: "zone", id: "bilanProfitables", label: "Aménagements profitables", min: 90 },
        { t: "zone", id: "liaison", label: "Liaison primaire-collège (à remplir avec un enseignant du collège)", min: 80 },
      ],
    },
    {
      titre: "Visas",
      champs: [{ t: "liste", id: "visas", label: "Révisions du plan", colonnes: ["Date", "Visa des parents", "Signature du directeur / chef d'établissement"], lignes: 4 }],
    },
  ],
};

// ── PAI ───────────────────────────────────────────────────────────────────
const PAI: Dispositif = {
  id: "pai", nom: "PAI", nomLong: "Projet d'accueil individualisé",
  sousTitre: "Élève atteint de troubles de la santé évoluant sur une longue période",
  reference: "Circulaire n° 2003-135 du 8 septembre 2003",
  sections: [
    {
      titre: "Identification",
      champs: [
        { t: "ligne", id: "etablissement", label: "École / établissement" },
        { t: "ligne", id: "classe", label: "Classe" },
        { t: "ligne", id: "anneeScolaire", label: "Année scolaire" },
        { t: "ligne", id: "responsables", label: "Responsables légaux", large: true },
        { t: "liste", id: "contacts", label: "Personnes à prévenir en cas d'urgence", colonnes: ["Nom", "Lien avec l'élève", "Téléphone"], lignes: 3 },
      ],
    },
    {
      titre: "Données médicales",
      note: "Renseigné par le médecin ; les éléments confidentiels restent sous pli fermé.",
      champs: [
        { t: "ligne", id: "medecin", label: "Médecin traitant / spécialiste", large: true },
        { t: "zone", id: "pathologie", label: "Trouble de santé ou pathologie", min: 80 },
        { t: "zone", id: "traitement", label: "Traitement pendant le temps scolaire (médicament, posologie, horaires, lieu de conservation)", min: 90 },
        { t: "ligne", id: "protocole", label: "Protocole d'urgence joint (oui / non)" },
      ],
    },
    {
      titre: "Conduite à tenir en cas d'urgence",
      champs: [
        { t: "zone", id: "signes", label: "Signes d'alerte à repérer", min: 80 },
        { t: "zone", id: "gestes", label: "Gestes à effectuer, qui appeler et dans quel ordre", min: 100 },
      ],
    },
    {
      titre: "Aménagements de la scolarité",
      champs: [
        { t: "zone", id: "regime", label: "Régime alimentaire particulier / panier repas", min: 70 },
        { t: "zone", id: "amenagements", label: "Aménagements du temps scolaire, de l'EPS, des sorties et des évaluations", min: 100 },
        { t: "zone", id: "absences", label: "Organisation en cas d'absences répétées ou d'hospitalisation", min: 80 },
      ],
    },
    {
      titre: "Signatures",
      champs: [{ t: "liste", id: "signatures", label: "Validation du projet", colonnes: ["Qualité", "Nom", "Date et signature"], lignes: 4 }],
    },
  ],
};

// ── PPRE ──────────────────────────────────────────────────────────────────
const PPRE: Dispositif = {
  id: "ppre", nom: "PPRE", nomLong: "Programme personnalisé de réussite éducative",
  sousTitre: "Élève risquant de ne pas maîtriser les connaissances et compétences attendues",
  reference: "Article D. 311-12 du code de l'éducation",
  sections: [
    {
      titre: "Identification",
      champs: [
        { t: "ligne", id: "classe", label: "Classe" },
        { t: "ligne", id: "anneeScolaire", label: "Année scolaire" },
        { t: "ligne", id: "periode", label: "Période couverte (du … au …)", large: true },
        { t: "ligne", id: "enseignant", label: "Enseignant·e responsable du suivi", large: true },
      ],
    },
    {
      titre: "Constat",
      champs: [
        { t: "zone", id: "difficultes", label: "Difficultés constatées (domaines, évaluations à l'appui)", min: 100 },
        { t: "zone", id: "appuis", label: "Points d'appui de l'élève", min: 80 },
      ],
    },
    {
      titre: "Objectifs et actions",
      champs: [
        { t: "liste", id: "objectifs", label: "Objectifs prioritaires", colonnes: ["Objectif", "Critère de réussite", "Échéance"], lignes: 4 },
        { t: "liste", id: "actions", label: "Aides mises en œuvre", colonnes: ["Action", "Qui intervient", "Quand / où"], lignes: 5 },
        { t: "zone", id: "engagementEleve", label: "Ce que l'élève s'engage à faire", min: 70 },
        { t: "zone", id: "engagementFamille", label: "Ce que la famille s'engage à faire", min: 70 },
      ],
    },
    {
      titre: "Bilan",
      champs: [
        { t: "ligne", id: "dateBilan", label: "Date du bilan" },
        { t: "zone", id: "bilan", label: "Objectifs atteints, évolution constatée", min: 100 },
        { t: "zone", id: "suites", label: "Suites données (poursuite, arrêt, autre dispositif)", min: 80 },
      ],
    },
    {
      titre: "Signatures",
      champs: [{ t: "liste", id: "signatures", label: "Validation", colonnes: ["Qualité", "Nom", "Date et signature"], lignes: 4 }],
    },
  ],
};

// ── PPS ───────────────────────────────────────────────────────────────────
const PPS: Dispositif = {
  id: "pps", nom: "PPS", nomLong: "Projet personnalisé de scolarisation",
  sousTitre: "Élève reconnu en situation de handicap — mise en œuvre de la décision de la CDAPH",
  reference: "Articles D. 351-5 et suivants du code de l'éducation",
  sections: [
    {
      titre: "Identification et décision",
      champs: [
        { t: "ligne", id: "numDossier", label: "N° de dossier MDPH" },
        { t: "ligne", id: "dateNotification", label: "Date de la notification CDAPH" },
        { t: "ligne", id: "validite", label: "Période de validité", large: true },
        { t: "ligne", id: "referent", label: "Enseignant référent", large: true },
        { t: "ligne", id: "etablissement", label: "École / établissement" },
        { t: "ligne", id: "classe", label: "Classe" },
      ],
    },
    {
      titre: "Modalités de scolarisation",
      champs: [
        { t: "zone", id: "tempsScolarisation", label: "Temps de scolarisation (quotité, répartition dans la semaine)", min: 80 },
        { t: "zone", id: "dispositif", label: "Dispositif collectif (ULIS, unité d'enseignement, SEGPA…) et temps d'inclusion", min: 80 },
        { t: "zone", id: "transport", label: "Transport adapté", min: 60 },
      ],
    },
    {
      titre: "Compensations notifiées",
      champs: [
        { t: "zone", id: "aideHumaine", label: "Aide humaine (individuelle / mutualisée, quotité, missions)", min: 90 },
        { t: "zone", id: "materiel", label: "Matériel pédagogique adapté", min: 80 },
        { t: "zone", id: "soins", label: "Accompagnements médico-sociaux et soins (SESSAD, libéral…)", min: 90 },
      ],
    },
    {
      titre: "Mise en œuvre pédagogique",
      champs: [
        { t: "zone", id: "amenagements", label: "Aménagements et adaptations pédagogiques", min: 100 },
        { t: "liste", id: "objectifs", label: "Objectifs d'apprentissage prioritaires", colonnes: ["Domaine", "Objectif", "Échéance"], lignes: 5 },
        { t: "zone", id: "evaluations", label: "Adaptations des évaluations et des examens", min: 80 },
      ],
    },
    {
      titre: "Équipe de suivi de la scolarisation",
      champs: [
        { t: "ligne", id: "dateEss", label: "Date de la réunion" },
        { t: "liste", id: "participants", label: "Participants", colonnes: ["Nom", "Fonction"], lignes: 6 },
        { t: "zone", id: "bilan", label: "Bilan de la période écoulée", min: 100 },
        { t: "zone", id: "propositions", label: "Propositions pour la suite du parcours", min: 90 },
      ],
    },
  ],
};

export const DISPOSITIFS: Dispositif[] = [PPS, PAP, PAI, PPRE];
