// L'organisation et la gestion de données au cycle 2 : des séquences bâties
// sur le programme.
//
// Les livrets d'accompagnement n'ont pas de séquence pour les données ;
// l'enseignant a demandé (2026-10-07) qu'on les construise depuis le
// programme et les guides, en le disant. Le programme de mathématiques du
// cycle 2 (2024) en donne la progression et les exemples, cités : au CP,
// organiser des données qu'on a soi-même recueillies avant d'en extraire de
// l'information — l'enquête, le relevé par bâtons, le tableau, le diagramme
// de cubes puis en barres — et le tableau à double entrée ; au CE1, lire des
// tableaux et des diagrammes qu'on n'a pas construits ; au CE2, des
// caractères quantitatifs, une échelle adaptée, des problèmes. Chaque séance
// suit la démarche en quatre temps des livrets.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_DONNEES, STYLE_DONNEES, htmlDonnees, type ReglagesDonnees } from "./donnees";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const trois = (titre: string, objectif: string, situation: string, activite: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(T1, "10 min", situation), ph(T2, "25 min", activite, posture), ph(T3, "10 min", retenir)]);

const PROGRAMME = "Bâtie sur le programme de mathématiques du cycle 2 (2024) et les guides Éduscol, à la demande de l'enseignant, faute de séquence dans les livrets d'accompagnement ; démarche en quatre temps des livrets";

const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 20, [
  ph("Évaluation", "15 min", `Une feuille : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

const DONNEES_CP: Demarche = {
  id: "donnees-cp", nom: "Une enquête : relevé, tableau, diagramme (CP)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Avant d'extraire de l'information de tableaux ou de graphiques, organiser des données qu'on a soi-même recueillies : une enquête dans la classe — « Parmi ces quatre fruits, quel est ton fruit préféré : orange, fraise, banane ou kiwi ? » —, de deux à cinq réponses possibles, moins de quarante individus ; un outil pour recueillir toutes les réponses, le relevé par bâtons ; le tableau ; le diagramme en barres, d'abord fait de cubes, à raison d'un cube par élève. À chaque étape, interpréter et communiquer : le plus, le moins, autant que, plus que, moins que.",
  seances: [
    trois("Une question pour la classe", "poser une question à la classe et recueillir toutes les réponses sans en oublier.",
      "« Quel est ton animal préféré ? » : comment savoir ce que la classe répond, sans oublier personne ?",
      "Chacun répond ; on cherche un moyen de noter les réponses — une liste, des croix, des bâtons au tableau — ; on vérifie qu'il y a autant de réponses que d'élèves.",
      "Ce qu'on retient : un bâton par réponse ; compter les bâtons."),
    trois("Du relevé au tableau", "organiser les réponses recueillies dans un tableau.",
      "Les bâtons au tableau, en vrac : comment les présenter pour qu'on lise vite ?",
      "Grouper les bâtons par réponse, compter, écrire les nombres dans un tableau à deux colonnes : la réponse, le nombre d'élèves.",
      "La trace écrite : le tableau de l'enquête de la classe."),
    trois("Un diagramme de cubes", "représenter les résultats d'une enquête par des tours de cubes, puis par un diagramme en barres.",
      "Une tour de cubes par réponse, un cube par élève : laquelle est la plus haute ?",
      "Construire les tours de cubes, les aligner sur une même ligne ; dessiner le diagramme en barres sur quadrillage, case par case.",
      "Ce qu'on retient : la plus haute barre, c'est la réponse la plus choisie.", "Fais aligner les tours au même niveau : c'est la condition pour comparer."),
    trois("Lire et comparer", "lire un tableau ou un diagramme et dire : le plus, le moins, autant que, plus que, moins que.",
      "Le diagramme d'une autre classe : qu'a-t-elle répondu ?",
      "Répondre à des questions sur un diagramme et un tableau ; formuler des phrases avec plus que, moins que, autant que.",
      "Les phrases de la classe, affichées sous le diagramme."),
    evaluation("lire un diagramme et dire le plus, le moins, plus que, moins que", "Ensuite, le tableau à double entrée."),
  ],
};

const DOUBLE_ENTREE_CP: Demarche = {
  id: "double-entree-cp", nom: "Le tableau à double entrée (CP)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Un tableau à double entrée permet de représenter tous les couples qu'on peut former à partir de deux critères, par exemple la forme et la couleur ; une ligne et une colonne identifient le contenu de la case située à leur intersection. Construire et compléter un tableau des formes et des couleurs.",
  seances: [
    trois("Trier selon deux critères", "trier des objets selon deux critères à la fois : la forme et la couleur.",
      "Des formes de plusieurs couleurs, en vrac : comment les ranger pour retrouver vite le carré vert ?",
      "Trier d'abord par forme, puis par couleur ; puis les ranger sur une grande grille au sol, les formes en lignes, les couleurs en colonnes.",
      "Ce qu'on retient : chaque objet a sa case."),
    trois("Le tableau à double entrée", "trouver la case d'un objet à l'intersection d'une ligne et d'une colonne.",
      "Le carré bleu : sa ligne, sa colonne, sa case.",
      "Placer des formes dans le tableau ; retrouver ce qu'il y a dans une case désignée par sa ligne et sa colonne.",
      "La trace écrite : un tableau à double entrée, ses lignes, ses colonnes, ses cases."),
    trois("Compléter le tableau", "compléter un tableau à double entrée dont quelques cases sont remplies.",
      "Le tableau des formes et des couleurs, trois cases déjà faites : que mettre dans les autres ?",
      "Dessiner et colorier chaque forme dans sa case ; vérifier ligne par ligne, colonne par colonne.",
      "Ce qu'on retient : toutes les formes, de toutes les couleurs, chacune une fois."),
    evaluation("compléter un tableau à double entrée", "Ensuite, au CE1, lire des tableaux à double entrée."),
  ],
};

const DONNEES_CE1: Demarche = {
  id: "donnees-ce1", nom: "Tableaux et diagrammes en barres (CE1)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Continuer à mener des enquêtes sur un caractère qualitatif — de deux à cinq réponses, moins de cent individus —, compiler les résultats dans un tableau et produire un diagramme en barres dont l'axe vertical est gradué de un en un ; extraire de l'information de tableaux et de diagrammes qu'on n'a pas construits : « Quelle est la couleur la plus fréquente ? », « Combien d'élèves viennent à pied à l'école ? », et, dans un tableau à double entrée, « Combien de garçons viennent à l'école en vélo ? ».",
  seances: [
    trois("Mener une enquête", "mener une enquête auprès de deux classes et recueillir les réponses.",
      "« Comment viens-tu à l'école ? » : on interroge aussi la classe voisine.",
      "Préparer la question et l'outil de recueil ; interroger ; compter avec des bâtons groupés par cinq.",
      "Ce qu'on retient : grouper par cinq pour compter vite."),
    trois("Le tableau des résultats", "compiler les résultats d'une enquête dans un tableau.",
      "Les relevés des deux classes : comment les réunir ?",
      "Construire le tableau des résultats ; vérifier que le total est le nombre d'élèves interrogés.",
      "La trace écrite : le tableau, et son total."),
    trois("Le diagramme en barres", "construire un diagramme en barres à partir d'un tableau, l'axe gradué de un en un.",
      "Comment dessiner les résultats pour qu'on voie tout de suite le plus et le moins ?",
      "Tracer les barres à la règle sur un axe gradué de un en un ; comparer avec le tableau.",
      "Ce qu'on retient : la hauteur de la barre se lit sur l'axe."),
    trois("Lire un diagramme", "répondre à des questions dont les réponses se lisent sur un diagramme en barres.",
      "Le diagramme d'une enquête qu'on n'a pas faite : que nous apprend-il ?",
      "Répondre à des questions : combien, le plus, le moins, combien de plus, combien en tout.",
      "La méthode : lire le haut de la barre sur l'axe."),
    trois("Lire un tableau à double entrée", "lire un nombre à l'intersection d'une ligne et d'une colonne d'un tableau à double entrée.",
      "« Combien de garçons viennent à l'école en vélo ? » : où regarder ?",
      "Des questions sur un tableau filles et garçons, moyens de transport ; puis en inventer pour un camarade.",
      "Ce qu'on retient : la ligne, la colonne, la case."),
    evaluation("lire un diagramme en barres et un tableau à double entrée", "Ensuite, au CE2, des problèmes à partir des données."),
  ],
};

const DONNEES_CE2: Demarche = {
  id: "donnees-ce2", nom: "Tableaux, diagrammes et échelles (CE2)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Les caractères étudiés peuvent être quantitatifs — le nombre de frères et sœurs, l'âge — ; mener une enquête, compiler les résultats dans un tableau et produire un diagramme en barres avec une échelle adaptée aux données ; utiliser des données fournies par un texte ou un tableau pour produire un diagramme ; trouver dans un tableau ou sur un diagramme la réponse à une question ; compléter un tableau et ses totaux.",
  seances: [
    trois("Une enquête et ses données", "recueillir et organiser des données sur un caractère quantitatif : le nombre de frères et sœurs.",
      "« Combien as-tu de frères et sœurs ? » : une réponse qui est un nombre.",
      "Recueillir les réponses de la classe, puis de l'école ; les ranger dans un tableau.",
      "Ce qu'on retient : les réponses peuvent être des mots ou des nombres."),
    trois("Choisir l'échelle", "produire un diagramme en barres avec une échelle adaptée aux données.",
      "Quatre-vingts élèves : un carreau par élève, la barre sort de la feuille !",
      "Choisir une échelle — un carreau pour deux, pour cinq, pour dix élèves —, graduer l'axe, tracer les barres d'après un texte ou un tableau.",
      "La trace écrite : l'axe gradué, l'échelle."),
    trois("Lire diagrammes et tableaux", "trouver dans un tableau ou sur un diagramme la réponse à une question.",
      "« Quelle est la couleur la plus fréquente ? », « Combien d'élèves viennent à pied ? »",
      "Répondre à des questions sur des diagrammes à échelles variées et sur des tableaux à double entrée.",
      "La méthode : lire l'échelle avant de lire la barre."),
    trois("Compléter un tableau", "compléter un tableau à double entrée en s'appuyant sur ses totaux.",
      "Des cases vides, mais les totaux sont là : peut-on les retrouver ?",
      "Compléter des tableaux ; vérifier que les lignes et les colonnes font leur total.",
      "Ce qu'on retient : une case manque, le total la donne."),
    evaluation("produire et lire des tableaux et des diagrammes", "Ensuite, résoudre des problèmes avec des données."),
  ],
};

const PROBLEMES_DONNEES_CE2: Demarche = {
  id: "problemes-donnees-ce2", nom: "Des problèmes avec des données (CE2)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Résoudre des problèmes dont les données sont à prélever dans un tableau à double entrée ou un diagramme en barres, sur le modèle du programme : « Les 175 élèves de l'école Poséidon habitent dans quatre villes différentes : Alphaville, Bêtaville, Gammaville et Deltaville. Compléter le graphique suivant avec la barre correspondant à l'effectif des élèves de Deltaville. »",
  seances: [
    trois("Prélever des données", "prélever dans un tableau ou un diagramme les données utiles à un problème.",
      "Un diagramme, une question : quelles barres regarder ?",
      "Pour chaque problème, entourer d'abord les données utiles, puis calculer.",
      "La méthode : la question, les données utiles, le calcul, la phrase réponse."),
    trois("La barre qui manque", "retrouver une donnée manquante d'un diagramme à partir d'un total.",
      "« Les 175 élèves de l'école Poséidon… » : la barre de Deltaville manque.",
      "Calculer l'effectif manquant, tracer la barre selon l'échelle ; d'autres problèmes de même type.",
      "On compare les démarches : soustraire du total, ou compléter."),
    trois("Des problèmes avec un tableau", "résoudre des problèmes à une ou deux étapes à partir d'un tableau à double entrée.",
      "Le tableau des transports de l'école : combien de plus viennent à pied qu'en bus ?",
      "Des problèmes de comparaison, de réunion, à partir des cases et des totaux.",
      "La trace écrite : un problème résolu, ses données entourées."),
    evaluation("résoudre des problèmes à partir d'un tableau ou d'un diagramme", "Ensuite, au cycle 3, d'autres graphiques."),
  ],
};

export const DEMARCHES_DONNEES: Demarche[] = [DONNEES_CP, DOUBLE_ENTREE_CP, DONNEES_CE1, DONNEES_CE2, PROBLEMES_DONNEES_CE2];

/** La séquence d'une compétence d'organisation et gestion de données, à sa classe ; rien sinon. En minuscules sans accents. */
export function demarcheDesDonnees(classe: string, comp: string): string | null {
  if (classe === "cp") return /double entree/.test(comp) ? "double-entree-cp" : "donnees-cp";
  if (classe === "ce1") return "donnees-ce1";
  if (classe === "ce2") return /resoudre des problemes/.test(comp) ? "problemes-donnees-ce2" : "donnees-ce2";
  return null;
}

const donnees = (seance: number, titre: string, r: Partial<ReglagesDonnees>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_DONNEES, ...r };
  return { seance, atelier: "donnees", titre, fabriquer: (g) => ({ html: htmlDonnees(reglages, g), style: STYLE_FEUILLE + STYLE_DONNEES }) };
};

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "donnees-cp": {
    feuilles: [
      donnees(1, "Une enquête dans la classe", { exercice: "releve", classe: "CP" }),
      donnees(3, "Lire un diagramme", { exercice: "lireDiagramme", classe: "CP" }),
      donnees(4, "Lire un diagramme — évaluation", { exercice: "lireDiagramme", classe: "CP" }),
    ],
    materiel: ["Le tableau de la classe ; des étiquettes-réponses", "Le relevé de la classe", "Des cubes emboîtables ; du papier quadrillé", "Le diagramme d'une autre classe", "Les énoncés"],
  },
  "double-entree-cp": {
    feuilles: [
      donnees(2, "Le tableau des formes et des couleurs", { exercice: "doubleEntree", classe: "CP" }),
      donnees(3, "Le tableau des formes — évaluation", { exercice: "doubleEntree", classe: "CP" }),
    ],
    materiel: ["Des formes de plusieurs couleurs ; une grande grille au sol", "Des formes ; le tableau affiché", "Des crayons de couleur", "Des crayons de couleur"],
  },
  "donnees-ce1": {
    feuilles: [
      donnees(1, "Une enquête dans la classe", { exercice: "releve", classe: "CE1" }),
      donnees(2, "Construire un diagramme", { exercice: "construireDiagramme", classe: "CE1" }),
      donnees(3, "Lire un diagramme", { exercice: "lireDiagramme", classe: "CE1" }),
      donnees(4, "Lire un tableau à double entrée", { exercice: "lireTableau", classe: "CE1" }),
      donnees(5, "Lire un diagramme — évaluation", { exercice: "lireDiagramme", classe: "CE1" }),
    ],
    materiel: ["Des feuilles de relevé", "Les relevés des deux classes", "Du papier quadrillé ; la règle", "Des diagrammes d'enquêtes", "Un tableau filles et garçons, moyens de transport", "Les énoncés"],
  },
  "donnees-ce2": {
    feuilles: [
      donnees(1, "Construire un diagramme", { exercice: "construireDiagramme", classe: "CE2" }),
      donnees(2, "Lire un diagramme", { exercice: "lireDiagramme", classe: "CE2" }),
      donnees(2, "Lire un tableau à double entrée", { exercice: "lireTableau", classe: "CE2" }),
      donnees(3, "Compléter un tableau", { exercice: "completerTableau", classe: "CE2" }),
      donnees(4, "Compléter un tableau — évaluation", { exercice: "completerTableau", classe: "CE2" }),
    ],
    materiel: ["Des feuilles de relevé", "Du papier quadrillé ; la règle", "Des diagrammes et des tableaux", "Des tableaux à compléter", "Les énoncés"],
  },
  "problemes-donnees-ce2": {
    feuilles: [
      donnees(1, "La barre qui manque", { exercice: "problemes", classe: "CE2" }),
      donnees(2, "Des problèmes avec un tableau", { exercice: "lireTableau", classe: "CE2" }),
      donnees(3, "Des problèmes — évaluation", { exercice: "problemes", classe: "CE2" }),
    ],
    materiel: ["Des diagrammes et des énoncés", "La règle", "Le tableau des transports de l'école", "Les énoncés"],
  },
};

export const estUneDemarcheDeDonnees = (id: string) => id in PLANS;

export function planDesDonnees(demarcheId: string): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
