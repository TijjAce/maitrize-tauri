// Gabarits de tableaux de langage assisté : modèle et règles.
//
// La logique vit ici plutôt que dans l'écran, pour que les règles qui font la
// valeur d'un TLA — les places ne bougent pas, la grille ne se renumérote pas
// — soient vérifiables par des tests plutôt que par l'œil.

import { CaseTla, Gabarit, NatureMot, caseVide, newId } from "./api";

export const NATURES: { id: NatureMot; label: string; couleur: string }[] = [
  { id: "personne", label: "Personne", couleur: "#fff2b8" },
  { id: "verbe", label: "Verbe", couleur: "#d9f0d4" },
  { id: "adjectif", label: "Descriptif", couleur: "#d6e6f7" },
  { id: "social", label: "Social", couleur: "#fadeeb" },
  { id: "petit mot", label: "Petit mot", couleur: "#f0f0f0" },
  { id: "nom", label: "Nom", couleur: "#fce6ca" },
];

export const couleurNature = (n: NatureMot) =>
  NATURES.find((x) => x.id === n)?.couleur ?? "#fce6ca";

/** Tailles de grille courantes, du plus accessible au plus fourni. */
export const FORMATS = [
  { colonnes: 3, lignes: 2, label: "3 × 2 — 6 cases" },
  { colonnes: 4, lignes: 3, label: "4 × 3 — 12 cases" },
  { colonnes: 5, lignes: 4, label: "5 × 4 — 20 cases" },
  { colonnes: 6, lignes: 5, label: "6 × 5 — 30 cases" },
  { colonnes: 8, lignes: 6, label: "8 × 6 — 48 cases" },
];

export function nouveauGabarit(colonnes = 6, lignes = 5): Gabarit {
  return {
    id: newId(), nom: "Nouveau tableau", eleve: "",
    colonnes, lignes, paysage: true,
    cases: Array.from({ length: colonnes * lignes }, caseVide),
  };
}

/**
 * Change la taille de la grille **sans déplacer les cases existantes**.
 *
 * C'est la règle qui compte le plus dans tout ce fichier. Un TLA vaut par la
 * stabilité des emplacements : l'enfant atteint « je » sans regarder parce que
 * « je » est toujours au même endroit. Redimensionner en réempilant les cases
 * de gauche à droite les décalerait toutes et annulerait l'apprentissage.
 * On raisonne donc en coordonnées : la case (colonne 2, ligne 3) reste en
 * (2, 3), la grille gagne ou perd des rangs et des colonnes sur ses bords.
 */
export function redimensionner(g: Gabarit, colonnes: number, lignes: number): Gabarit {
  const cases: CaseTla[] = [];
  for (let l = 0; l < lignes; l++) {
    for (let c = 0; c < colonnes; c++) {
      const dansAncienne = c < g.colonnes && l < g.lignes;
      cases.push(dansAncienne ? g.cases[l * g.colonnes + c] : caseVide());
    }
  }
  return { ...g, colonnes, lignes, cases };
}

/** Nombre de cases remplies. */
export const remplies = (g: Gabarit) => g.cases.filter((c) => c.pictoId !== null).length;

/**
 * Cases perdues si l'on réduit la grille à cette taille.
 *
 * Rétrécir efface des cases remplies sans qu'on s'en aperçoive : l'écran doit
 * pouvoir prévenir avant, pas s'excuser après.
 */
export function casesPerdues(g: Gabarit, colonnes: number, lignes: number): number {
  let n = 0;
  for (let l = 0; l < g.lignes; l++) {
    for (let c = 0; c < g.colonnes; c++) {
      if ((c >= colonnes || l >= lignes) && g.cases[l * g.colonnes + c]?.pictoId !== null) n++;
    }
  }
  return n;
}

/** Remplace une case, sans toucher aux autres. */
export function poser(g: Gabarit, index: number, valeur: CaseTla): Gabarit {
  const cases = g.cases.slice();
  cases[index] = valeur;
  return { ...g, cases };
}

/**
 * Contrôle qu'un gabarit est cohérent avant impression ou après import.
 *
 * Un tableau dont la grille et les cases se contredisent s'imprimerait décalé,
 * ce qui est précisément le défaut qu'on cherche à ne jamais produire.
 */
export function verifier(g: Gabarit): string[] {
  const soucis: string[] = [];
  if (!g.nom.trim()) soucis.push("Le tableau n'a pas de nom.");
  if (g.colonnes < 1 || g.lignes < 1) soucis.push("La grille est vide.");
  if (g.cases.length !== g.colonnes * g.lignes) {
    soucis.push(`La grille annonce ${g.colonnes} × ${g.lignes} cases mais en contient ${g.cases.length}.`);
  }
  for (const c of g.cases) {
    if (c.pictoId !== null && !c.mot.trim()) {
      soucis.push("Une case porte un pictogramme sans mot.");
      break;
    }
  }
  return soucis;
}

/**
 * Relit un gabarit venu d'un fichier.
 *
 * L'import sert à reprendre le gabarit de l'orthophoniste ou de la maison :
 * c'est la voie normale, pas un cas limite. Un fichier abîmé doit donc être
 * refusé clairement, jamais réparé en silence — un tableau réparé de travers
 * serait pire qu'un import échoué.
 */
export function lireGabarit(json: string): Gabarit {
  const brut = JSON.parse(json);
  const g: Gabarit = {
    id: newId(),
    nom: String(brut?.nom ?? "").trim() || "Tableau importé",
    eleve: String(brut?.eleve ?? ""),
    colonnes: Number(brut?.colonnes) || 0,
    lignes: Number(brut?.lignes) || 0,
    paysage: brut?.paysage !== false,
    cases: Array.isArray(brut?.cases)
      ? brut.cases.map((c: any): CaseTla => ({
          pictoId: c?.pictoId === null || c?.pictoId === undefined ? null : Number(c.pictoId),
          fichier: String(c?.fichier ?? ""),
          mot: String(c?.mot ?? ""),
          nature: (NATURES.some((n) => n.id === c?.nature) ? c.nature : "nom") as NatureMot,
        }))
      : [],
  };
  const soucis = verifier(g);
  if (soucis.length) throw new Error(soucis.join(" "));
  return g;
}
