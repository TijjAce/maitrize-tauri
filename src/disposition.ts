// Disposition libre du bureau du plan de travail, comme un vrai bureau : on
// pose un dossier ou un document sur la case de son choix, il y reste.
//
// Le bureau est une grille de cases. Chaque dossier du plan de travail garde
// sa disposition dans un réglage « bureau:<chemin> » (le bureau lui-même :
// « bureau: »), qui voyage entre les ordinateurs avec la sauvegarde.
// Ce qui n'a pas encore été placé prend la première case libre.

import { estDans, renommerChemin, parent, SEPARATEUR } from "./dossiers";

export interface Case { col: number; rang: number }
/** Case de chaque tuile, par clé : « d:<nom du sous-dossier> », « s:<id> », « m:<id> », « t:<id> ». */
export type Positions = Record<string, [number, number]>;

export const PREFIXE_BUREAU = "bureau:";

const cleCase = (c: Case) => `${c.col},${c.rang}`;

export function lirePositions(valeur: string | null | undefined): Positions {
  if (!valeur) return {};
  try {
    const v = JSON.parse(valeur);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const res: Positions = {};
    for (const [k, p] of Object.entries(v)) {
      if (Array.isArray(p) && p.length === 2 && p.every((n) => Number.isInteger(n) && n >= 0 && n < 10000)) res[k] = [p[0], p[1]];
    }
    return res;
  } catch {
    return {};
  }
}

/** Les dispositions de tous les dossiers, lues dans l'ensemble des réglages. */
export function lireDispositions(reglages: Record<string, string>): Record<string, Positions> {
  const res: Record<string, Positions> = {};
  for (const [cle, valeur] of Object.entries(reglages)) {
    if (cle.startsWith(PREFIXE_BUREAU) && valeur) res[cle.slice(PREFIXE_BUREAU.length)] = lirePositions(valeur);
  }
  return res;
}

/**
 * La case de chaque tuile. Une tuile placée garde sa case — si elle tient dans
 * la largeur et n'est pas déjà prise ; les autres, dans l'ordre donné, prennent
 * les premières cases libres, rang par rang.
 */
export function disposer(cles: string[], positions: Positions, nbCols: number): Record<string, Case> {
  const cols = Math.max(1, nbCols);
  const res: Record<string, Case> = {};
  const prises = new Set<string>();
  for (const cle of cles) {
    const p = positions[cle];
    if (!p || p[0] >= cols) continue;
    const c = { col: p[0], rang: p[1] };
    if (prises.has(cleCase(c))) continue;
    res[cle] = c;
    prises.add(cleCase(c));
  }
  let curseur = 0;
  for (const cle of cles) {
    if (res[cle]) continue;
    let c: Case;
    do { c = { col: curseur % cols, rang: Math.floor(curseur / cols) }; curseur++; } while (prises.has(cleCase(c)));
    res[cle] = c;
    prises.add(cleCase(c));
  }
  return res;
}

/** La case libre la plus proche de la cible (la cible elle-même si elle est libre). */
export function caseLibreLaPlusProche(cible: Case, prises: Set<string>, nbCols: number): Case {
  const cols = Math.max(1, nbCols);
  const depart = { col: Math.min(Math.max(0, cible.col), cols - 1), rang: Math.max(0, cible.rang) };
  if (!prises.has(cleCase(depart))) return depart;
  for (let rayon = 1; rayon < 10000; rayon++) {
    let meilleure: Case | null = null;
    let distance = Infinity;
    for (let dr = -rayon; dr <= rayon; dr++) {
      for (let dc = -rayon; dc <= rayon; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== rayon) continue;
        const c = { col: depart.col + dc, rang: depart.rang + dr };
        if (c.col < 0 || c.col >= cols || c.rang < 0 || prises.has(cleCase(c))) continue;
        const d = dc * dc + dr * dr;
        if (d < distance) { distance = d; meilleure = c; }
      }
    }
    if (meilleure) return meilleure;
  }
  return { col: 0, rang: prises.size };
}

/**
 * La disposition après avoir posé `cle` sur `cible`. Toutes les tuiles visibles
 * sont figées à leur case : en poser une ne fait pas bouger les autres. Si la
 * case est prise, la tuile va à la case libre la plus proche.
 */
export function poser(disposition: Record<string, Case>, cle: string, cible: Case, nbCols: number): Positions {
  const prises = new Set(Object.entries(disposition).filter(([k]) => k !== cle).map(([, c]) => cleCase(c)));
  const arrivee = caseLibreLaPlusProche(cible, prises, nbCols);
  const res: Positions = {};
  for (const [k, c] of Object.entries(disposition)) res[k] = k === cle ? [arrivee.col, arrivee.rang] : [c.col, c.rang];
  if (!disposition[cle]) res[cle] = [arrivee.col, arrivee.rang];
  return res;
}

const nomDe = (chemin: string) => chemin.slice(chemin.lastIndexOf(SEPARATEUR) + 1);

/**
 * Les réglages à réécrire quand le dossier `ancien` devient `nouveau` (renommé
 * ou déplacé) : les dispositions de son contenu le suivent, sous-dossiers
 * compris, et sa case dans le dossier parent le suit s'il y reste.
 * `nouveau` vide avec `vider` : le dossier disparaît, ses sous-dossiers remontent.
 */
export function reporterDispositions(
  dispositions: Record<string, Positions>, ancien: string, nouveau: string, vider = false,
): Record<string, string> {
  const ecritures: Record<string, string> = {};
  for (const [chemin, pos] of Object.entries(dispositions)) {
    if (!chemin || !estDans(chemin, ancien)) continue;
    ecritures[PREFIXE_BUREAU + chemin] = ecritures[PREFIXE_BUREAU + chemin] ?? "";
    if (vider && chemin === ancien) continue; // son contenu remonte et prend les cases libres du parent
    const arrivee = renommerChemin(chemin, ancien, nouveau);
    if (arrivee !== chemin || !vider) ecritures[PREFIXE_BUREAU + arrivee] = JSON.stringify(pos);
  }
  // Sa case dans le dossier parent, sous son nouveau nom s'il y reste.
  const parentAncien = parent(ancien);
  const pos = dispositions[parentAncien];
  const cleAncienne = `d:${nomDe(ancien)}`;
  if (pos && pos[cleAncienne]) {
    const suite = { ...pos };
    const garde = suite[cleAncienne];
    delete suite[cleAncienne];
    if (!vider && parent(nouveau) === parentAncien) suite[`d:${nomDe(nouveau)}`] = garde;
    const cle = PREFIXE_BUREAU + parentAncien;
    ecritures[cle] = JSON.stringify(suite);
  }
  return ecritures;
}
