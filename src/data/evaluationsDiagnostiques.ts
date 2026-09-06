// Grilles d'évaluation diagnostique.
//
// Deux outils complémentaires, décrits en données pour qu'un seul écran sache
// les afficher, les enregistrer et les imprimer :
//
//  - « Observation générale » : grille détaillée de comportements observables,
//    d'après la grille publiée par Ebla Éditions dans « Enseigner en Ulis ».
//    Reproduite ici pour l'usage personnel de l'enseignant qui possède
//    l'ouvrage ; la source est affichée dans l'écran et à l'impression.
//
//  - « Observation S4C » : la grille personnalisée de Cap école inclusive
//    (Réseau Canopé), reprise item pour item depuis le PDF que l'outil génère
//    — 101 observables, rangés en 25 sous-domaines sous les cinq domaines du
//    socle. Les propositions d'adaptation, elles, restent sur leur site, vers
//    lequel l'écran renvoie.

export type Bloc =
  /** Cases à cocher indépendantes. */
  | { t: "cases"; id: string; titre: string; items: string[] }
  /** Un seul choix parmi des options courtes. */
  | { t: "choix"; id: string; titre: string; options: string[] }
  /**
   * Items notés sur une échelle, groupés par sous-domaine — c'est la forme
   * de la grille S4C, où chaque domaine du socle se décline en sous-domaines
   * puis en observables concrets.
   */
  | { t: "echelle"; id: string; titre: string; groupes: { nom: string; items: string[] }[] }
  /** Champs de saisie libre, en colonnes. */
  | { t: "champs"; id: string; titre: string; champs: { id: string; label: string }[] };

/** Placement d'un bloc dans la grille papier : colonne et couleur du titre. */
export interface Mise { col: 1 | 2 | 3; couleur: string }

export interface Grille {
  id: string;
  nom: string;
  sousTitre: string;
  source: string;
  lien?: string;
  /** Niveaux proposés pour les blocs « echelle ». */
  niveaux?: string[];
  /**
   * Disposition à l'écran et à l'impression. « colonnes » reproduit la mise
   * en page du document d'origine : trois colonnes de rubriques encadrées,
   * titres en capitales colorées. On la garde parce que l'enseignant connaît
   * cette grille de vue et la remplit plus vite quand elle en a l'allure.
   */
  disposition?: "liste" | "colonnes";
  /** Placement de chaque bloc, quand la disposition est en colonnes. */
  mise?: Record<string, Mise>;
  blocs: Bloc[];
}

// ── Grille d'observation de classe ───────────────────────────────────────
const OBSERVATION: Grille = {
  id: "observation",
  nom: "Observation générale",
  sousTitre: "Comportements observables, du repérage dans le temps à l'autonomie",
  source: "D'après la grille d'observation publiée par Ebla Éditions, « Enseigner en Ulis »",
  disposition: "colonnes",
  mise: {
    lateralite:    { col: 1, couleur: "#4b5262" },
    sante:         { col: 2, couleur: "#4b5262" },
    priseEnCharge: { col: 3, couleur: "#4b5262" },
    reglesDeVie:   { col: 1, couleur: "#2e7d4f" },
    adultes:       { col: 2, couleur: "#2e7d4f" },
    pairs:         { col: 3, couleur: "#2e7d4f" },
    memorisation:  { col: 1, couleur: "#8e2f2f" },
    attention:     { col: 2, couleur: "#2f5aa8" },
    securite:      { col: 3, couleur: "#c2591f" },
    temps:         { col: 1, couleur: "#b03030" },
    espace:        { col: 2, couleur: "#1f7a6b" },
    deplacer:      { col: 3, couleur: "#b03030" },
    motriciteFine: { col: 1, couleur: "#8e2f2f" },
    motricite:     { col: 2, couleur: "#2f3f7a" },
    autonomie:     { col: 3, couleur: "#c2591f" },
    communication: { col: 1, couleur: "#2e7d4f" },
    tache:         { col: 2, couleur: "#2f3f7a" },
    maths:         { col: 3, couleur: "#a8317a" },
    lecture:       { col: 2, couleur: "#2f5aa8" },
    organisation:  { col: 1, couleur: "#8e2f2f" },
    evaluation:    { col: 2, couleur: "#2f5aa8" },
    installation:  { col: 3, couleur: "#8e2f2f" },
    comptine:      { col: 3, couleur: "#4b5262" },
    identite:      { col: 1, couleur: "#4b5262" },
    synthese:      { col: 1, couleur: "#4b5262" },
  },
  blocs: [
    {
      t: "champs", id: "identite", titre: "Identification",
      champs: [
        { id: "observateur", label: "Nom de l'observateur" },
        { id: "date", label: "Date de l'observation" },
        { id: "age", label: "Âge" },
      ],
    },
    { t: "choix", id: "lateralite", titre: "Latéralité", options: ["gaucher", "droitier", "ambidextre"] },
    { t: "cases", id: "sante", titre: "Éléments de santé",
      items: ["porte des lunettes", "porte un appareil dentaire", "PAI"] },
    { t: "cases", id: "priseEnCharge", titre: "Prise en charge",
      items: ["psychologue", "orthophonie", "psychomotricité", "kiné", "éducateur", "ergothérapie"] },

    { t: "choix", id: "reglesDeVie", titre: "Respecte les règles de vie", options: ["oui", "parfois", "non"] },
    { t: "choix", id: "adultes", titre: "Respecte les adultes", options: ["oui", "parfois", "non"] },
    { t: "choix", id: "pairs", titre: "Respecte les pairs", options: ["oui", "parfois", "non"] },

    { t: "cases", id: "memorisation", titre: "Mémorisation", items: [
      "oubli de la consigne systématique",
      "se rappelle la séance précédente",
      "ne fixe pas les apprentissages",
      "peut réciter une poésie",
    ] },
    { t: "cases", id: "attention", titre: "Attention", items: [
      "entre dans l'activité",
      "est attentif 5 min",
      "est attentif 15 min",
      "est attentif 30 min",
      "est attentif avec présence adulte",
      "instabilité corporelle",
    ] },
    { t: "cases", id: "securite", titre: "Sécurité", items: [
      "n'a pas conscience du danger",
      "met tout à la bouche",
      "est attiré par le danger mais en a conscience",
    ] },
    { t: "cases", id: "temps", titre: "Le temps", items: [
      "aucun repère",
      "se repère avec des outils",
      "se repère sur la journée",
      "se repère sur la semaine",
      "se repère dans le mois",
      "se repère dans l'année",
      "lit l'heure",
      "comprend les durées",
    ] },
    { t: "cases", id: "espace", titre: "L'espace", items: [
      "ne se repère pas",
      "se repère par rapport à lui",
      "se repère dans la classe",
      "se repère dans le bâtiment",
      "se repère dans l'établissement",
      "se repère dans le quartier",
      "se repère dans la ville",
      "se repère sur un plan",
    ] },
    { t: "cases", id: "deplacer", titre: "Se déplacer", items: [
      "se déplace avec un adulte, même dans un même lieu",
      "a peur de se déplacer",
      "commence à se déplacer dans l'établissement",
      "commence à se déplacer dans la rue",
      "peut travailler sur « être piéton »",
    ] },
    { t: "cases", id: "motriciteFine", titre: "Motricité fine et écriture", items: [
      "laisse une trace",
      "tient correctement un outil scripteur",
      "écrit en capitale",
      "écrit en cursive",
      "copie",
      "utilise l'ordinateur pour écrire",
      "écrit des mots",
      "écrit des phrases",
      "écrit des textes",
    ] },
    { t: "cases", id: "motricite", titre: "Motricité", items: [
      "marche", "court", "saute", "se tient en équilibre", "instabilité corporelle",
    ] },
    { t: "cases", id: "autonomie", titre: "Autonomie", items: [
      "s'habille seul",
      "fait ses lacets",
      "mange seul",
      "boit seul",
      "coupe seul",
      "problème de déglutition",
      "pas de satiété",
      "n'est pas propre",
      "va aux WC",
      "a besoin d'un adulte pour aller aux WC",
    ] },
    { t: "cases", id: "tache", titre: "Rapport à la tâche", items: [
      "entre dans la tâche",
      "va au bout de la tâche",
      "respecte la demande s'il a compris",
    ] },
    { t: "cases", id: "communication", titre: "Communication", items: [
      "est mutique",
      "dit quelques mots",
      "emploie le « je »",
      "se fait comprendre par gestes",
      "se saisit d'un outil de communication",
      "fait des phrases",
      "écholalie",
      "logorrhée verbale",
      "comprend la parole de l'autre",
    ] },
    { t: "cases", id: "lecture", titre: "Lecture", items: [
      "a un projet de lecteur",
      "reconnaît des mots en global",
      "commence à encoder",
      "déchiffre",
      "ne connaît pas les sons complexes",
      "lit des phrases simples",
      "lit des textes",
      "comprend ce qu'il lit",
      "a accès à l'implicite, aux inférences",
    ] },
    { t: "cases", id: "maths", titre: "Maths et calculs", items: [
      "connaît la comptine numérique",
      "a la notion des quantités",
      "additionne",
      "soustrait",
      "multiplie",
      "divise",
      "calcule avec une calculatrice",
      "résout des problèmes",
      "reconnaît des figures",
      "mesure",
      "utilise les outils géométriques",
    ] },
    { t: "champs", id: "comptine", titre: "Précisions",
      champs: [{ id: "comptineJusqua", label: "Connaît la comptine jusqu'à" }] },
    { t: "cases", id: "organisation", titre: "Organisation", items: [
      "range, se repère dans son matériel",
      "perd ou détruit son travail",
      "sait utiliser des outils pour s'aider",
    ] },
    { t: "cases", id: "evaluation", titre: "Évaluation", items: [
      "craint l'erreur",
      "accepte les évaluations",
      "refuse les situations d'évaluation",
    ] },
    { t: "cases", id: "installation", titre: "Installation dans la classe", items: [
      "RAS", "refus de rentrer", "compliquée", "négocie",
    ] },
    { t: "champs", id: "synthese", titre: "Synthèse",
      champs: [{ id: "remarques", label: "Remarques et pistes de travail" }] },
  ],
};

// ── Observation des besoins (Cap école inclusive) ────────────────────────
const BESOINS: Grille = {
  id: "besoins",
  nom: "Observation S4C",
  sousTitre: "Les observables de la grille Cap école inclusive, rangés sous les cinq domaines du socle",
  source: "Grille d'observation personnalisée de Cap école inclusive (Réseau Canopé)",
  lien: "https://www.reseau-canope.fr/cap-ecole-inclusive/observer.html",
  // Échelle de la grille officielle.
  niveaux: ["Souvent", "Parfois", "Rarement", "Jamais"],
  blocs: [
  {
    t: "echelle", id: "d1", titre: "1. Les langages pour penser et communiquer",
    groupes: [
      { nom: "Communication expressive orale", items: [
        "Utilise des phrases avec des expansions",
        "Parle de façon intelligible",
        "Respecte l'ordre des mots dans les phrases",
        "S'exprime verbalement",
      ] },
      { nom: "Compréhension du langage oral", items: [
        "Comprend un discours ou un récit",
        "Comprend une consigne orale y compris en contexte bruyant",
      ] },
      { nom: "Lecture - Déchiffrage", items: [
        "Lit les mots irréguliers",
        "Déchiffre aisément les mots réguliers",
      ] },
      { nom: "Fluidité de la lecture", items: [
        "Peut lire une phrase courte",
        "Lit facilement un stock de mots fréquents",
        "Peut lire un texte de quelques lignes",
      ] },
      { nom: "Compréhension du langage écrit", items: [
        "Comprend tous les textes y compris implicites",
        "Comprend un texte court, simple et explicite",
        "Comprend une phrase courte",
        "Comprend une consigne écrite",
      ] },
      { nom: "Accès au sens orthographique", items: [
        "Encode des graphies complexes",
        "Encode des graphies simples",
        "Mémorise l'orthographe d'usage",
      ] },
      { nom: "Production d'écrit", items: [
        "Produit un texte organisé et compréhensible",
        "Peut rédiger un texte de quelques lignes",
        "Peut rédiger une phrase",
        "Peut copier un texte de quelques lignes",
      ] },
      { nom: "Interactions sociales", items: [
        "Répond de manière adaptée aux mimiques/intonations et gestes",
        "Est capable de prendre en compte la parole de l'autre",
        "Regarde le locuteur",
        "Adopte une attitude verbale appropriée (intensité, forme)",
        "Respecte les règles de la prise de parole (politessse, forme)",
        "Accepte d'échanger en dehors de ses centres d'intérêts",
        "Reste dans le contexte de la discussion",
      ] },
    ],
  },
  {
    t: "echelle", id: "d2", titre: "2. Les méthodes et outils pour apprendre",
    groupes: [
      { nom: "Gestion de la tâche", items: [
        "Exécute la tâche dans le temps imparti (hors lenteur d'écriture et de lecture)",
        "Travaille seul",
        "S'organise et anticipe",
        "Reste assis à sa place avec une posture adaptée à la tâche",
        "S'organise matériellement",
        "Exécute une consigne orale double",
        "Peut coordonner plusieurs savoir faire pour réaliser une tâche",
        "Entre facilement dans la tâche",
        "Fait attention à son matériel",
      ] },
      { nom: "Attention", items: [
        "Sélectionne l'information pertinente d'une consigne",
        "Maintient son attention en regroupement ou en travail collectif",
        "Maintient son attention sur la durée",
      ] },
      { nom: "Mémoire", items: [
        "Mémorise les faits numériques",
        "Mémorise une poésie",
        "Mémorise une leçon courte",
      ] },
      { nom: "Fonctionnement cognitif", items: [
        "Accède aux contenus d'apprentissage de son âge",
        "Fait des déductions/inférences à partir d'un texte ou d'une situation problème",
        "Pose des questions, est curieux",
      ] },
      { nom: "Relation aux pairs et aux adultes/Adaptation sociale", items: [
        "Communique avec les adultes",
        "Communique avec ses camarades",
        "Accepte de travailler en groupe",
        "Accepte de changer d'activité dans les séances d'apprentissage",
        "Varie ses activités",
        "Accepte les changements de lieux, de personnes, d'activités",
        "Participe aux jeux de cour",
        "Accepte le contact visuel",
      ] },
    ],
  },
  {
    t: "echelle", id: "d3", titre: "3. La formation de la personne et du citoyen",
    groupes: [
      { nom: "Autonomie", items: [
        "Formule un avis, fait des choix",
        "Se présente à l'heure aux cours",
        "Se déplace et s'installe dans la classe",
        "Est autonome dans les gestes quotidiens (habillage...)",
        "Est autonome dans ses déplacements",
        "Se positionne comme un élève de sa classe d'âge",
      ] },
      { nom: "Estime de soi", items: [
        "Admet facilement ses erreurs",
        "Identifie ses réussites",
        "S'engage et et persévère face à une tâche nouvelle ou difficile",
        "Se sent en situation de réussite",
      ] },
      { nom: "Gestion des émotions", items: [
        "Exprime ses émotions",
        "Maîtrise ses émotions",
      ] },
      { nom: "Sensorialité", items: [
        "S'autostimule : répète les mêmes gestes, les mêmes jeux, les mêmes comportements (balancement?)",
        "Accepte les variations de luminosité",
        "Accepte la proximité et le contact physique de façon controlée",
        "Accepte toutes les odeurs",
        "Accepte toutes sortes de bruits : nuisances sonores, intensité de la voix, mots-stimulis",
      ] },
      { nom: "Personnel", items: [
        "S'intègre de façon adaptée dans un groupe",
        "Assure sa sécurité physique",
        "Respecte ses engagements",
        "Réagit de manière adaptée aux remarques de l'adulte",
        "Gère les conflits avec les autres enfants",
      ] },
      { nom: "Inter-personnel", items: [
        "Entre en relation avec les autres sans agressivité",
        "Entre en relation sans recherche d'attention exclusive",
      ] },
      { nom: "Respect des règles de vie", items: [
        "Accepte les contraintes",
        "Respecte les règles établies",
      ] },
    ],
  },
  {
    t: "echelle", id: "d4", titre: "4. Les systèmes naturels et les systèmes techniques",
    groupes: [
      { nom: "Mathématiques", items: [
        "Analyse les figures géométriques",
        "Manipule les outils pour réaliser des figures géométriques",
        "Peut utiliser une calculatrice",
        "Résoud un problème",
        "Utilise les techniques de pose et de résolution d'opérations",
        "Calcule mentalement",
        "Écrit les nombres",
        "Lit des nombres",
        "Dénombre",
        "Comprend la signification des opérations",
      ] },
      { nom: "Démarche d'investigation", items: [
        "Mène une démarche d'investigation en intégralité ou en partie",
      ] },
      { nom: "Gestes moteurs", items: [
        "Pratique aisément une activité physique",
        "Exécute des gestes liés à la motricité fine : dessiner, colorier, découper, coller",
        "Coordonne ses gestes (habillage, repas, toilettes)",
        "A une posture confortable lors d'une activité",
        "Écrit lisiblement",
      ] },
    ],
  },
  {
    t: "echelle", id: "d5", titre: "5. Les représentations du monde et l'activité humaine",
    groupes: [
      { nom: "L'espace et le temps", items: [
        "S'oriente dans l'espace",
        "Se repère dans le temps",
        "Repère des informations visuelles dans un support écrit : tableaux, cartes",
      ] },
      { nom: "Organisations et représentations du monde", items: [
        "Analyse des représentations iconiques (images, courbes, schémas)",
      ] },
    ],
  },
    { t: "champs", id: "suite", titre: "Suites données",
      champs: [
        { id: "prioritaires", label: "Besoins prioritaires retenus" },
        { id: "adaptations", label: "Adaptations mises en place" },
      ] },
  ],
};

export const GRILLES: Grille[] = [OBSERVATION, BESOINS];

/** Nombre d'items renseignés dans une grille, pour l'aperçu de complétion. */
export function compterRenseignes(grille: Grille, valeurs: Record<string, any>): number {
  let n = 0;
  for (const b of grille.blocs) {
    const v = valeurs[b.id];
    if (v == null) continue;
    if (b.t === "cases") n += Object.values(v).filter(Boolean).length;
    else if (b.t === "choix") n += v ? 1 : 0;
    else if (b.t === "echelle") n += Object.values(v).filter((x) => String(x ?? "").trim()).length;
    else if (b.t === "champs") n += Object.values(v).filter((x) => String(x ?? "").trim()).length;
  }
  return n;
}

/** Total d'items d'une grille, pour situer la progression. */
export function compterTotal(grille: Grille): number {
  return grille.blocs.reduce((n, b) => {
    if (b.t === "cases") return n + b.items.length;
    if (b.t === "echelle") return n + b.groupes.reduce((m, g) => m + g.items.length, 0);
    if (b.t === "champs") return n + b.champs.length;
    return n + 1;
  }, 0);
}
