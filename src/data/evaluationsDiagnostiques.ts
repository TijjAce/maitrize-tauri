// Grilles d'évaluation diagnostique.
//
// Deux outils complémentaires, décrits en données pour qu'un seul écran sache
// les afficher, les enregistrer et les imprimer :
//
//  - « Observation de classe » : grille détaillée de comportements observables,
//    d'après la grille publiée par Ebla Éditions dans « Enseigner en Ulis ».
//    Reproduite ici pour l'usage personnel de l'enseignant qui possède
//    l'ouvrage ; la source est affichée dans l'écran et à l'impression.
//
//  - « Besoins de l'élève » : les 25 domaines d'observation de Cap école
//    inclusive (Réseau Canopé), rangés sous les cinq domaines du socle commun.
//    Les items sont relevés sur le site ; les propositions d'adaptation, elles,
//    restent sur leur outil en ligne, vers lequel l'écran renvoie.

export type Bloc =
  /** Cases à cocher indépendantes. */
  | { t: "cases"; id: string; titre: string; items: string[] }
  /** Un seul choix parmi des options courtes. */
  | { t: "choix"; id: string; titre: string; options: string[] }
  /** Chaque item reçoit un niveau, plus une note libre facultative. */
  | { t: "echelle"; id: string; titre: string; items: string[] }
  /** Champs de saisie libre, en colonnes. */
  | { t: "champs"; id: string; titre: string; champs: { id: string; label: string }[] };

export interface Grille {
  id: string;
  nom: string;
  sousTitre: string;
  source: string;
  lien?: string;
  /** Niveaux proposés pour les blocs « echelle ». */
  niveaux?: string[];
  blocs: Bloc[];
}

// ── Grille d'observation de classe ───────────────────────────────────────
const OBSERVATION: Grille = {
  id: "observation",
  nom: "Observation de classe",
  sousTitre: "Comportements observables, du repérage dans le temps à l'autonomie",
  source: "D'après la grille d'observation publiée par Ebla Éditions, « Enseigner en Ulis »",
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
  nom: "Besoins de l'élève",
  sousTitre: "Les 25 domaines d'observation, rangés sous les cinq domaines du socle commun",
  source: "Domaines d'observation de Cap école inclusive (Réseau Canopé)",
  lien: "https://www.reseau-canope.fr/cap-ecole-inclusive/observer.html",
  niveaux: ["Réussi", "En cours", "Difficulté", "Non observé"],
  blocs: [
    { t: "echelle", id: "d1", titre: "1. Les langages pour penser et communiquer", items: [
      "Communication expressive orale",
      "Compréhension du langage oral",
      "Lecture — déchiffrage",
      "Fluidité de la lecture",
      "Compréhension du langage écrit",
      "Accès au sens orthographique",
      "Production d'écrit",
      "Interactions sociales",
    ] },
    { t: "echelle", id: "d2", titre: "2. Les méthodes et outils pour apprendre", items: [
      "Gestion de la tâche",
      "Attention",
      "Mémoire",
      "Fonctionnement cognitif",
      "Relation aux pairs et aux adultes — adaptation sociale",
    ] },
    { t: "echelle", id: "d3", titre: "3. La formation de la personne et du citoyen", items: [
      "Autonomie",
      "Estime de soi",
      "Gestion des émotions",
      "Sensorialité",
      "Personnel",
      "Inter-personnel",
      "Respect des règles de vie",
    ] },
    { t: "echelle", id: "d4", titre: "4. Les systèmes naturels et les systèmes techniques", items: [
      "Mathématiques",
      "Démarche d'investigation",
      "Gestes moteurs",
    ] },
    { t: "echelle", id: "d5", titre: "5. Les représentations du monde et l'activité humaine", items: [
      "L'espace et le temps",
      "Organisations et représentations du monde",
    ] },
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
    else if (b.t === "echelle") n += Object.values(v).filter((x) => x && x !== "Non observé").length;
    else if (b.t === "champs") n += Object.values(v).filter((x) => String(x ?? "").trim()).length;
  }
  return n;
}

/** Total d'items d'une grille, pour situer la progression. */
export function compterTotal(grille: Grille): number {
  return grille.blocs.reduce((n, b) => {
    if (b.t === "cases" || b.t === "echelle") return n + b.items.length;
    if (b.t === "champs") return n + b.champs.length;
    return n + 1;
  }, 0);
}
