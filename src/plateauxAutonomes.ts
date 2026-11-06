// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Les plateaux de manipulation, à faire seul ─────────────────────────────
//
// L'enseignant l'a demandé (4 novembre 2026) : « pour les PS il faut des
// ateliers autonomes sensoriels comme les activités que je t'ai données tout
// à l'heure » — celles du document d'Amandine Frison (DSDEN de la Savoie),
// dont sont faites les séquences de petite section (demarchesAteliersPS.ts).
//
// « En retard » donne donc aux élèves de petite section des plateaux plutôt
// que des feuilles. Chacun est un atelier de ces séquences : ce qu'on pose
// sur le plateau, les étapes que l'élève suit — les consignes de la séance
// qui le montre —, et ce qu'il doit obtenir, de quoi vérifier seul. Sa fiche
// est le séquentiel de « Décomposer la tâche » : la tablette le montre étape
// par étape, avec les pictos et la voix.
//
// Un plateau ne se fait seul qu'une fois montré : il vient à la période où sa
// séquence le présente (voir periodesProposees.ts). Ni noix, ni élastiques,
// ni ballons de baudruche, ni boîte sonore qui s'ouvre : seul, un petit enfant
// les porte à la bouche ou les fait éclater, et le programme rappelle le
// risque d'étouffement des petits objets (p. 60). Une classe qui a fait
// l'inventaire de son matériel ne reçoit que les plateaux qu'elle a.

import type { Inventaire } from "./materielDeClasse";

export type FamilleDePlateau = "viePratique" | "sens" | "tailles" | "tracer";

export interface Plateau {
  id: string;
  /** Ce que l'élève fait, tel qu'on le lit au cahier journal. */
  nom: string;
  famille: FamilleDePlateau;
  /** La séquence de petite section qui le montre, et la période que Maitrize lui suggère. */
  sequence: string;
  periode: number;
  /** Ce qu'on pose sur le plateau. */
  surLePlateau: string;
  /** Ce que l'élève fait, étape par étape : les consignes de la séance, à la première personne. */
  etapes: string[];
  /** Ce qu'il doit obtenir : de quoi vérifier seul. */
  resultat: string;
  /** Le matériel de la classe qu'il prend (voir materielDeClasse.ts). */
  materiel: string;
}

const VERSER = "ateliers-verser-ps", OUVRIR = "ateliers-ouvrir-ps", SENS = "ateliers-sens-ps", TAILLES = "ateliers-tailles-ps", TRACER = "ateliers-tracer-ps";

/** Les plateaux de la petite section, dans l'ordre de l'année. */
export const PLATEAUX_PS: Plateau[] = [
  // Période 1 : verser, pincer.
  { id: "plateau-verser", nom: "Le plateau de l'eau à verser", famille: "viePratique", sequence: VERSER, periode: 1, materiel: "transvasement",
    surLePlateau: "Une petite carafe d'eau, un gobelet et une éponge, sur un plateau à rebord.",
    etapes: ["Je prends la carafe à deux mains.", "Je verse doucement dans le gobelet.", "Je remets l'eau dans la carafe.", "J'éponge si ça coule.", "Je range le plateau."],
    resultat: "L'eau est dans la carafe, et la table est sèche." },
  { id: "plateau-pinces-linge", nom: "Le plateau des pinces à linge", famille: "viePratique", sequence: VERSER, periode: 1, materiel: "pinces",
    surLePlateau: "Des pinces à linge de quatre couleurs, et quatre bols des mêmes couleurs.",
    etapes: ["Je presse la pince.", "Je l'accroche au bol de la même couleur.", "J'accroche toutes les pinces.", "Je décroche et je range."],
    resultat: "Chaque pince est sur le bol de sa couleur." },
  // Période 2 : ouvrir, fermer, visser ; laisser des traces.
  { id: "plateau-couvercles", nom: "Le plateau des couvercles", famille: "viePratique", sequence: OUVRIR, periode: 2, materiel: "fermetures",
    surLePlateau: "Trois boîtes de tailles et de formes différentes, leurs couvercles mélangés.",
    etapes: ["J'ouvre les boîtes.", "Je cherche le bon couvercle.", "Je ferme chaque boîte.", "Je range."],
    resultat: "Chaque boîte est fermée avec son couvercle." },
  { id: "plateau-visser", nom: "Le plateau des flacons à visser", famille: "viePratique", sequence: OUVRIR, periode: 2, materiel: "fermetures",
    surLePlateau: "Des flacons et de petites bouteilles de tailles différentes, avec leurs bouchons.",
    etapes: ["Je tiens le flacon.", "Je dévisse le bouchon.", "Je trouve le bon bouchon.", "Je revisse."],
    resultat: "Chaque flacon a son bouchon, bien vissé." },
  { id: "plateau-cadenas", nom: "Le plateau des cadenas", famille: "viePratique", sequence: OUVRIR, periode: 2, materiel: "fermetures",
    surLePlateau: "Trois ou quatre cadenas de tailles différentes, et leurs clés.",
    etapes: ["Je prends une clé.", "J'essaie dans le cadenas.", "Il s'ouvre : je le referme.", "Je range les clés."],
    resultat: "J'ai ouvert et refermé chaque cadenas." },
  { id: "plateau-fermetures", nom: "Le plateau des fermetures", famille: "viePratique", sequence: OUVRIR, periode: 2, materiel: "fermetures",
    surLePlateau: "Les cadres d'habillage : une fermeture éclair, des boutons-pression, de gros boutons.",
    etapes: ["Je tiens le bas.", "Je remonte la fermeture.", "Je presse les boutons.", "Je passe le bouton dans le trou."],
    resultat: "Les cadres sont fermés." },
  { id: "plateau-chaussettes", nom: "Le plateau des chaussettes", famille: "viePratique", sequence: OUVRIR, periode: 2, materiel: "enfilage",
    surLePlateau: "Des chaussettes par paires, de couleurs et de motifs différents, des pinces à linge et un panier.",
    etapes: ["Je prends une chaussette.", "Je cherche la même.", "Je les accroche avec la pince.", "Je range."],
    resultat: "Les chaussettes sont accrochées par paires." },
  { id: "plateau-semoule", nom: "Le plateau de semoule", famille: "tracer", sequence: TRACER, periode: 2, materiel: "tracerDoigt",
    surLePlateau: "Un plateau à rebord, couvert d'une fine couche de semoule.",
    etapes: ["Je trace avec mon doigt.", "Je regarde la trace.", "Je secoue pour effacer.", "Je recommence."],
    resultat: "J'ai fait des traces : des lignes, des ronds, des points." },
  { id: "plateau-pate", nom: "Le plateau de pâte à modeler", famille: "tracer", sequence: TRACER, periode: 2, materiel: "tracerDoigt",
    surLePlateau: "De la pâte à modeler, un rouleau, une fourchette et un bâtonnet.",
    etapes: ["J'étale la pâte.", "Je trace avec l'outil.", "Je regarde la trace.", "Je roule pour effacer."],
    resultat: "La pâte garde la trace de chaque outil." },
  { id: "plateau-gel", nom: "Le plateau de la pochette de gel", famille: "tracer", sequence: TRACER, periode: 2, materiel: "tracerDoigt",
    surLePlateau: "Une pochette fermée remplie de gel, posée sur des chemins dessinés.",
    etapes: ["Je pose mon doigt au début.", "Je suis le chemin.", "Je regarde mon doigt.", "J'arrive au bout."],
    resultat: "J'ai suivi chaque chemin jusqu'au bout." },
  { id: "plateau-pistes", nom: "Le plateau des pistes graphiques", famille: "tracer", sequence: TRACER, periode: 2, materiel: "tracerDoigt",
    surLePlateau: "Des pistes plastifiées, un feutre effaçable et un chiffon.",
    etapes: ["Je mets le feutre au début.", "Je trace sans sortir de la piste.", "J'efface avec le chiffon.", "Je range le feutre."],
    resultat: "Mon trait reste sur la piste." },
  // Période 3 : les sens.
  { id: "plateau-sac", nom: "Le sac à toucher", famille: "sens", sequence: SENS, periode: 3, materiel: "toucher",
    surLePlateau: "Un sac de tissu, et quelques objets de la classe que l'élève connaît.",
    etapes: ["Je mets la main dans le sac.", "Je touche sans regarder.", "Je dis ce que c'est.", "Je le sors pour vérifier."],
    resultat: "J'ai trouvé chaque objet sans le regarder." },
  { id: "plateau-tissus", nom: "Le plateau des tissus", famille: "sens", sequence: SENS, periode: 3, materiel: "toucher",
    surLePlateau: "Des carrés de tissu par paires — doux, rugueux, lisses, épais — et un bandeau.",
    etapes: ["Je ferme les yeux.", "Je touche un tissu.", "Je cherche le même.", "Je dis : doux ou rugueux."],
    resultat: "Les tissus sont rangés par paires." },
  { id: "plateau-sons", nom: "Le plateau des boîtes sonores", famille: "sens", sequence: SENS, periode: 3, materiel: "sonsOdeurs",
    surLePlateau: "Trois paires de boîtes opaques, fermées pour de bon, qui font chacune leur bruit.",
    etapes: ["Je secoue la boîte.", "J'écoute.", "Je cherche celle qui fait le même bruit.", "Je pose les deux ensemble."],
    resultat: "Les boîtes sont rangées par paires." },
  { id: "plateau-odeurs", nom: "Le plateau des boîtes à odeurs", famille: "sens", sequence: SENS, periode: 3, materiel: "sonsOdeurs",
    surLePlateau: "Trois paires de boîtes à odeurs : des couvercles rouges, des couvercles jaunes.",
    etapes: ["Je sens une boîte rouge.", "Je sens les boîtes jaunes.", "Je mets ensemble les deux qui sentent pareil."],
    resultat: "Chaque boîte rouge est avec la boîte jaune qui sent pareil." },
  { id: "plateau-couleurs", nom: "Le plateau des couleurs", famille: "sens", sequence: SENS, periode: 3, materiel: "couleurs",
    surLePlateau: "Le loto des couleurs, ou les bonshommes et leurs haltères de quatre couleurs.",
    etapes: ["Je prends une carte.", "Je la pose sur la même couleur.", "Je dis le nom de la couleur."],
    resultat: "Chaque carte est sur sa couleur." },
  // Période 4 : ranger par taille, trier, faire comme le modèle.
  { id: "plateau-cubes", nom: "Le plateau des cubes", famille: "tailles", sequence: TAILLES, periode: 4, materiel: "taillesGigognes",
    surLePlateau: "Quatre à six cubes de tailles très différentes.",
    etapes: ["Je prends le plus grand cube.", "Je pose le plus grand de ceux qui restent.", "Jusqu'au plus petit.", "Je range."],
    resultat: "Ma tour tient debout." },
  { id: "plateau-gigognes", nom: "Le plateau des poupées gigognes", famille: "tailles", sequence: TAILLES, periode: 4, materiel: "taillesGigognes",
    surLePlateau: "Des poupées ou des boîtes gigognes : trois ou quatre pièces.",
    etapes: ["J'ouvre les poupées.", "Je les range de la plus grande à la plus petite.", "Je les remets l'une dans l'autre."],
    resultat: "Les poupées sont rangées l'une dans l'autre." },
  { id: "plateau-pommiers", nom: "Le plateau des pommiers", famille: "tailles", sequence: TAILLES, periode: 4, materiel: "taillesGigognes",
    surLePlateau: "La planche des trois pommiers — un gros, un moyen, un petit — et des pommes de trois tailles.",
    etapes: ["Je prends une pomme.", "Je regarde : grosse, moyenne ou petite.", "Je l'accroche sur le bon pommier."],
    resultat: "Chaque pomme est sur le pommier de sa taille." },
  { id: "plateau-batons", nom: "Le plateau des bâtons", famille: "tailles", sequence: TAILLES, periode: 4, materiel: "longueurs",
    surLePlateau: "Trois à cinq bâtons de longueurs très différentes.",
    etapes: ["Je pose les bâtons contre le bord.", "Je les range du plus court au plus long.", "Je regarde l'escalier."],
    resultat: "Les bâtons font un escalier." },
  { id: "plateau-tri", nom: "Le plateau du tri des couleurs", famille: "tailles", sequence: TAILLES, periode: 4, materiel: "couleurs",
    surLePlateau: "La boîte à compartiments, une couleur par case, et de gros objets de quatre couleurs.",
    etapes: ["Je prends un objet.", "Je regarde sa couleur.", "Je le mets dans la case de sa couleur."],
    resultat: "Chaque objet est dans la case de sa couleur." },
  { id: "plateau-formes", nom: "Le plateau des formes", famille: "tailles", sequence: TAILLES, periode: 4, materiel: "formesModeles",
    surLePlateau: "Des formes de couleur, et des modèles de trois ou quatre formes.",
    etapes: ["Je regarde le modèle.", "Je pose la même forme dessus.", "Je vérifie : c'est pareil."],
    resultat: "Mes formes sont posées comme sur le modèle." },
];

/**
 * Les plateaux dont la classe n'a pas le matériel, d'après son inventaire —
 * aucun tant qu'elle ne l'a pas fait : sans inventaire, tous se proposent.
 */
export function plateauxSansMateriel(inv: Inventaire): string[] {
  if (!Object.values(inv).some((x) => x.a)) return [];
  return PLATEAUX_PS.filter((p) => !inv[p.materiel]?.a).map((p) => p.id);
}
