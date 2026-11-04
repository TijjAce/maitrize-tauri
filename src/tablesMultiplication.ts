// ── Les tables de multiplication, pour le mur ─────────────────────────────
//
// « Dans les générateurs d'affichages, regarde les programmes et les guides
// Éduscol, et fais-en d'autres » (l'enseignant, 4 novembre 2026).
//
// Programme de mathématiques du cycle 2 (2024) : au CE1, « connaitre dans les
// deux sens les tables de multiplication » — « une égalité de type A × B = C
// ou C = A × B, où A et B sont des nombres entiers compris entre 0 et 10 » —,
// un apprentissage qui « s'étale sur l'année scolaire tout entière, de
// manière progressive » (p. 14) ; au CE2, leur mémorisation « se poursuit »
// (p. 22). Le guide « Pour enseigner les nombres, le calcul et la résolution
// de problèmes au CP » (Éduscol, 2021) affiche de même la table de Pythagore
// au mur (p. 63, figure 17).
//
// Une page par table : 3 × 1 … 3 × 10, chaque produit avec son rectangle de
// points — 3 rangées de 4 pour 3 × 4 —, qui fait voir le produit et que
// 3 × 4 = 4 × 3 ; ou la table de Pythagore de la multiplication, les tables
// choisies en couleur et les carrés sur la diagonale. Pour le mur, une page
// chacune ; pour l'élève, quatre par page, à découper et à coller dans le
// cahier — comme les tables d'addition (voir famillesAddition.ts).

import { feuille } from "./cartesImprimables";
import { BILLE_BLEUE, BILLE_ROUGE, bille } from "./numerationCP";
import { escapeHtml } from "./print";

/** Ce qu'on imprime : la table d'un nombre, ou la table de Pythagore. */
export type FormeMultiplication = "table" | "pythagore";

export interface ReglagesMultiplication {
  forme: FormeMultiplication;
  /** Les tables, de 0 à 10 : une page chacune ; en couleur dans la table de Pythagore. */
  tables: number[];
  /** « 3 × 4 = 12 », « 4 × 3 = 12 » — la table lue dans l'autre sens —, ou « 12 = 3 × 4 ». */
  ecriture: "produit" | "inverse" | "egalite";
  /** Le rectangle de points à côté de chaque produit. */
  points: boolean;
  /** La ligne du 0 — 3 × 0 — ; dans la table de Pythagore, la ligne et la colonne du 0. */
  avecZero: boolean;
  format: "mur" | "eleve";
  /** Le titre de chaque page, avant le nombre. */
  titre: string;
}

export const TABLES_POSSIBLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const TITRE_DES_TABLES = "La table de";
const TITRE_DE_PYTHAGORE = "La table de Pythagore";
export const REGLAGES_MULTIPLICATION: ReglagesMultiplication = {
  forme: "table", tables: [2, 5, 10], ecriture: "produit", points: true, avecZero: false, format: "mur", titre: TITRE_DES_TABLES,
};

/** Des réglages lus de la mémoire, sans leur faire confiance ; sans table, ceux de l'exemple. */
export function reglagesMultiplicationSurs(brut: Partial<ReglagesMultiplication> | null | undefined): ReglagesMultiplication {
  const b = brut ?? {};
  const tables = [...new Set((Array.isArray(b.tables) ? b.tables : [])
    .filter((n): n is number => typeof n === "number" && TABLES_POSSIBLES.includes(n)))].sort((x, y) => x - y);
  return {
    forme: b.forme === "pythagore" ? "pythagore" : "table",
    tables: tables.length ? tables : REGLAGES_MULTIPLICATION.tables,
    ecriture: b.ecriture === "inverse" || b.ecriture === "egalite" ? b.ecriture : "produit",
    points: b.points !== false,
    avecZero: b.avecZero === true,
    format: b.format === "eleve" ? "eleve" : "mur",
    titre: typeof b.titre === "string" && b.titre.trim() ? b.titre.trim() : TITRE_DES_TABLES,
  };
}

/** « La table de 3 » ; « Les tables de 2, 5 et 10 » ; « La table de Pythagore ». */
export function titreMultiplication(r: Pick<ReglagesMultiplication, "tables" | "titre" | "forme">): string {
  if (r.forme === "pythagore") return r.titre !== TITRE_DES_TABLES ? r.titre : TITRE_DE_PYTHAGORE;
  if (r.tables.length === 1) return `${r.titre} ${r.tables[0]}`;
  const liste = `${r.tables.slice(0, -1).join(", ")} et ${r.tables[r.tables.length - 1]}`;
  return r.titre === TITRE_DES_TABLES ? `Les tables de ${liste}` : `${r.titre} ${liste}`;
}

/**
 * Une ligne de la table, ses facteurs à leur couleur : « 3 × 4 = 12 » ;
 * « 4 × 3 = 12 », la table lue dans l'autre sens ; ou « 12 = 3 × 4 ».
 */
export function ecritureDuProduit(n: number, k: number, ecriture: ReglagesMultiplication["ecriture"]): string {
  const a = `<span class="tm-a">${n}</span>`, b = `<span class="tm-b">${k}</span>`;
  if (ecriture === "inverse") return `${b} × ${a} = ${n * k}`;
  if (ecriture === "egalite") return `${n * k} = ${a} × ${b}`;
  return `${a} × ${b} = ${n * k}`;
}

const NOIR = "#1c2233";
const n2 = (v: number) => String(Math.round(v * 100) / 100);

/**
 * Le rectangle de points de n × k : n rangées de k points — 3 × 4, trois fois
 * quatre. Les points rapetissent pour que le rectangle tienne dans sa ligne :
 * au plus `haut` millimètres de haut et 80 de large.
 */
export function rectangleDePoints(n: number, k: number, haut: number): string {
  if (n <= 0 || k <= 0) return "";
  const pas = Math.min(5, haut / n, 80 / k);
  const largeur = k * pas, hauteur = n * pas;
  const points = Array.from({ length: n }, (_, i) => Array.from({ length: k }, (_, j) =>
    bille(j * pas + pas / 2, i * pas + pas / 2, Math.round(pas * 38) / 100, i % 2 ? BILLE_ROUGE : BILLE_BLEUE)).join("")).join("");
  return `<svg class="tm-points" viewBox="0 0 ${n2(largeur)} ${n2(hauteur)}" style="width:${n2(largeur)}mm;height:${n2(hauteur)}mm">${points}</svg>`;
}

/** Les multiplicateurs d'une table : 1 à 10, et 0 d'abord si on le demande. */
const multiplicateurs = (avecZero: boolean) => Array.from({ length: avecZero ? 11 : 10 }, (_, i) => i + (avecZero ? 0 : 1));

/** La table d'un nombre : une ligne par produit, qui remplissent la page ; le rectangle de points à droite. */
function table(n: number, r: ReglagesMultiplication): string {
  const lignes = multiplicateurs(r.avecZero);
  const hauteur = 200 / lignes.length;
  const ecrit = Math.min(13, hauteur * 0.5);
  return `<div class="tm-titre">${escapeHtml(r.titre)} ${n}</div>`
    + `<div class="tm-table${r.points ? "" : " tm-sans-points"}" style="--tm-ecrit:${n2(ecrit)}mm">`
    + lignes.map((k) => `<div class="tm-ligne"><div class="tm-ecrit">${ecritureDuProduit(n, k, r.ecriture)}</div>`
      + (r.points ? `<div class="tm-dessin">${rectangleDePoints(n, k, hauteur * 0.82)}</div>` : "") + `</div>`).join("")
    + `</div>`;
}

/** La table de Pythagore : chaque produit à la croisée de sa ligne et de sa colonne ; les tables choisies en couleur, les carrés sur la diagonale. */
function pythagore(r: ReglagesMultiplication): string {
  const valeurs = multiplicateurs(r.avecZero);
  const choisie = (x: number) => r.tables.includes(x);
  const tete = `<div class="tm-coin">×</div>` + valeurs.map((b) => `<div class="tm-tete tm-b">${b}</div>`).join("");
  const lignes = valeurs.map((a) => `<div class="tm-tete tm-a">${a}</div>` + valeurs.map((b) => {
    const classes = ["tm-case", a === b ? "tm-carre" : "", choisie(a) || choisie(b) ? "tm-choisie" : ""].filter(Boolean).join(" ");
    return `<div class="${classes}">${a * b}</div>`;
  }).join("")).join("");
  return `<div class="tm-titre">${escapeHtml(titreMultiplication(r))}</div>`
    + `<div class="tm-pyth" style="grid-template-columns: repeat(${valeurs.length + 1}, 1fr)">${tete}${lignes}</div>`;
}

/**
 * Pour le mur, chaque table sur sa page — la table de Pythagore seule ; pour
 * l'élève, la même en petit, quatre fois sur une planche, à découper le long
 * du pointillé et à coller dans le cahier.
 */
export function htmlMultiplication(brut: Partial<ReglagesMultiplication>): string {
  const r = reglagesMultiplicationSurs(brut);
  const pages = r.forme === "pythagore" ? [pythagore(r)] : r.tables.map((n) => table(n, r));
  return feuille(r.format === "eleve"
    ? pages.map((c) => `<div class="page tm-planche">${`<div class="tm-petit"><div class="tm-page">${c}</div></div>`.repeat(4)}</div>`).join("")
    : pages.map((c) => `<div class="page tm-page">${c}</div>`).join(""), "tm");
}

// La page tient dans la hauteur utile de l'A4, comme celle des tables d'addition (voir famillesAddition.ts).
export const STYLE_MULTIPLICATION = `
  .feuille.tm .tm-page { display: flex; flex-direction: column; align-items: center; height: 250mm; box-sizing: border-box; }
  .feuille.tm .tm-titre { font-size: 9mm; font-weight: 800; line-height: 1.2; margin: 0 0 4mm; text-align: center; }
  .feuille.tm .tm-table { width: 180mm; flex: 1; display: flex; flex-direction: column; border: 1.2mm solid ${NOIR}; border-radius: 3mm;
    padding: 2mm 6mm; box-sizing: border-box; }
  .feuille.tm .tm-ligne { flex: 1; display: grid; grid-template-columns: 1fr 1fr; align-items: center; break-inside: avoid; page-break-inside: avoid; }
  .feuille.tm .tm-ligne + .tm-ligne { border-top: 0.4mm solid #e1e5ee; }
  .feuille.tm .tm-sans-points .tm-ligne { grid-template-columns: 1fr; }
  .feuille.tm .tm-ecrit { font-size: var(--tm-ecrit, 12mm); font-weight: 800; line-height: 1; white-space: nowrap; color: ${NOIR}; text-align: center; }
  .feuille.tm .tm-dessin { display: flex; align-items: center; justify-content: flex-start; }
  .feuille.tm .tm-points { display: block; }
  .feuille.tm .tm-a { color: ${BILLE_BLEUE}; }
  .feuille.tm .tm-b { color: ${BILLE_ROUGE}; }
  .feuille.tm .tm-pyth { display: grid; width: 180mm; margin-top: 6mm; border: 0.8mm solid ${NOIR}; }
  .feuille.tm .tm-pyth > div { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 6.5mm; font-weight: 800;
    border: 0.3mm solid #c9cfdc; color: ${NOIR}; }
  .feuille.tm .tm-coin, .feuille.tm .tm-tete { background: #f1f3f8; }
  .feuille.tm .tm-coin { color: #687087 !important; }
  .feuille.tm .tm-tete.tm-a { color: ${BILLE_BLEUE}; }
  .feuille.tm .tm-tete.tm-b { color: ${BILLE_ROUGE}; }
  .feuille.tm .tm-choisie { background: #e8f0ff; }
  .feuille.tm .tm-carre { background: #fff4dc; }
  .feuille.tm .tm-choisie.tm-carre { background: #ffe8b8; }
  /* Pour l'élève : quatre par planche, centrées dans leur pointillé de découpe (voir famillesAddition.ts). */
  .feuille.tm .tm-planche { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; height: 250mm; box-sizing: border-box; }
  .feuille.tm .tm-petit { zoom: 0.43; outline: 0.6mm dashed #9aa0b4; outline-offset: -1mm; box-sizing: border-box; overflow: hidden;
    display: flex; align-items: center; justify-content: center; }
`;
