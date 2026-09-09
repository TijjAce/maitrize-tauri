// Structure d'un tableau de langage assisté.
//
// Un TLA n'est **pas** un tableau de choix : ce n'est pas une liste de noms
// sur un thème. C'est une grille qui doit permettre de poser une question,
// de demander, de commenter et de donner un avis — donc de contenir des
// pronoms, des mots interrogatifs, des verbes, des adjectifs et des
// interjections, pas seulement des substantifs.
//
// L'organisation suit l'ordre de la phrase française : les colonnes vont de
// gauche à droite dans le sens syntaxique, les options d'un même groupe
// grammatical se lisent de haut en bas. Les deux dispositions ci-dessous
// (12 et 20 cases) reprennent les exemples publiés par Mathilde Suc-Mella
// d'après CHAT-Now de Gayle Porter ; les autres tailles s'en déduisent.
//
// Le thème ne remplit que la colonne des noms. Tout le reste est le noyau,
// et le noyau garde ses coordonnées d'un tableau à l'autre : c'est ce qui
// permet à l'élève de retrouver JE, TU, ENCORE et FINI sans les chercher.

import { NatureMot } from "./api";

/** Rôle d'une colonne dans la phrase. */
export type Role = "question" | "social" | "pronom" | "verbe" | "petit mot" | "nom" | "adjectif";

export const NATURE_DU_ROLE: Record<Role, NatureMot> = {
  question: "petit mot",
  social: "social",
  pronom: "personne",
  verbe: "verbe",
  "petit mot": "petit mot",
  nom: "nom",
  adjectif: "adjectif",
};

/**
 * Mots du noyau, par rôle et par ordre de priorité.
 *
 * Tous ont été vérifiés présents dans la banque ARASAAC française — un mot
 * absent laisserait un trou silencieux dans le tableau. Les libellés sont
 * ceux d'ARASAAC (« quoi ? » et non « quoi »), sans quoi la correspondance
 * exacte échouerait.
 */
export const NOYAU: Record<Role, string[]> = {
  question: ["quoi ?", "où", "qui", "quand", "pourquoi", "comment"],
  social: ["oui", "non", "bonjour", "merci", "super", "génial", "au revoir", "s'il te plaît"],
  pronom: ["je", "tu", "moi", "toi", "il", "elle", "nous", "vous"],
  verbe: ["vouloir", "aller", "faire", "aimer", "regarder", "aider", "jouer",
          "donner", "prendre", "mettre", "ouvrir", "arrêter"],
  "petit mot": ["encore", "fini", "plus", "dans", "sur", "avec", "maintenant", "après"],
  nom: [],
  adjectif: ["grand", "petit", "content", "fâché", "triste", "beau", "chaud", "froid", "cassé"],
};

export interface Squelette {
  colonnes: number;
  lignes: number;
  label: string;
  /** Vrai pour les deux dispositions publiées, faux pour les dérivées. */
  documente: boolean;
  /** Rôles empilés dans chaque colonne, de gauche à droite. */
  roles: Role[][];
}

export const SQUELETTES: Squelette[] = [
  {
    colonnes: 3, lignes: 3, label: "9 cases — 3 × 3", documente: false,
    roles: [["pronom"], ["verbe"], ["nom"]],
  },
  {
    colonnes: 4, lignes: 3, label: "12 cases — 4 × 3", documente: true,
    roles: [["question", "pronom"], ["verbe"], ["nom"], ["adjectif"]],
  },
  {
    colonnes: 4, lignes: 4, label: "16 cases — 4 × 4", documente: false,
    roles: [["question", "pronom"], ["verbe"], ["nom"], ["adjectif", "petit mot"]],
  },
  {
    colonnes: 5, lignes: 4, label: "20 cases — 5 × 4", documente: true,
    roles: [["question", "social"], ["pronom"], ["verbe"], ["petit mot", "nom"], ["adjectif"]],
  },
  {
    colonnes: 6, lignes: 5, label: "30 cases — 6 × 5", documente: false,
    roles: [["question", "social"], ["pronom"], ["verbe"], ["petit mot"], ["nom"], ["adjectif"]],
  },
  {
    colonnes: 8, lignes: 5, label: "40 cases — 8 × 5", documente: false,
    roles: [["question"], ["social"], ["pronom"], ["verbe"], ["petit mot"], ["nom"], ["nom"], ["adjectif"]],
  },
];

/** Le squelette d'une taille donnée, ou le plus proche. */
export function squelettePour(colonnes: number, lignes: number): Squelette {
  return (
    SQUELETTES.find((s) => s.colonnes === colonnes && s.lignes === lignes) ??
    SQUELETTES.reduce((a, b) =>
      Math.abs(a.colonnes * a.lignes - colonnes * lignes) <=
      Math.abs(b.colonnes * b.lignes - colonnes * lignes) ? a : b)
  );
}

/** Rôle attendu d'une case, d'après le squelette. */
export function roleDeLaCase(s: Squelette, colonne: number, ligne: number): Role | null {
  const pile = s.roles[colonne];
  if (!pile) return null;
  // Les rôles d'une colonne se partagent ses lignes, dans l'ordre.
  const parRole = Math.ceil(s.lignes / pile.length);
  return pile[Math.min(pile.length - 1, Math.floor(ligne / parRole))] ?? null;
}

/**
 * Les mots que le squelette demande, case par case.
 *
 * Renvoie, pour chaque case, le rôle et le mot du noyau à y poser — ou `null`
 * pour les cases du thème, que l'appelant remplira avec le vocabulaire de
 * l'activité. Le noyau vient toujours en tête de sa colonne, si bien qu'un
 * même mot retombe à la même place quel que soit le thème.
 */
export function plan(s: Squelette): { role: Role; mot: string | null }[] {
  const restant: Record<string, string[]> = {};
  for (const r of Object.keys(NOYAU) as Role[]) restant[r] = [...NOYAU[r]];
  const cases: { role: Role; mot: string | null }[] = [];
  for (let l = 0; l < s.lignes; l++) {
    for (let c = 0; c < s.colonnes; c++) {
      cases.push({ role: "nom", mot: null });
    }
  }
  // On parcourt colonne par colonne : chaque rôle épuise ses mots de haut en
  // bas avant de passer au suivant, comme sur le tableau planificateur.
  for (let c = 0; c < s.colonnes; c++) {
    for (let l = 0; l < s.lignes; l++) {
      const role = roleDeLaCase(s, c, l);
      if (!role) continue;
      const mot = role === "nom" ? null : restant[role].shift() ?? null;
      cases[l * s.colonnes + c] = { role, mot };
    }
  }
  return cases;
}

/** Nombre de cases que le thème doit remplir. */
export const placesDuTheme = (s: Squelette) =>
  plan(s).filter((c) => c.role === "nom").length;

/** Tous les mots du noyau demandés par un squelette, sans doublon. */
export function motsDuNoyau(s: Squelette): string[] {
  return [...new Set(plan(s).map((c) => c.mot).filter((m): m is string => !!m))];
}
