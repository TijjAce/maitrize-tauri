// Les familles d'addition : l'affichage du mur de la classe (demande de
// l'enseignant, 2026-11-01, pour sa séance des nombres jusqu'à 9 : « crée un
// affichage pour la famille d'addition du 7, 8 et 9 »).
//
// La famille d'un nombre, ce sont toutes ses façons de le faire en deux
// parties : 7, c'est 1 et 6, 2 et 5, 3 et 4… Une page par nombre, en maison :
// le nombre sous le toit, une décomposition par étage, et la même dans
// l'autre sens à côté — 3 + 4 et 4 + 3. Les billes sont celles de « Deux tas
// de billes » : bleues pour la première partie, rouges pour la seconde, et
// les chiffres aux mêmes couleurs. Le programme de 2024 veut les tables
// d'addition « dans les deux sens » : l'écriture se choisit, 4 + 3 = 7 ou
// 7 = 4 + 3.

import { feuille } from "./cartesImprimables";
import { BILLE_BLEUE, BILLE_ROUGE, bille } from "./numerationCP";
import { escapeHtml } from "./print";

export interface ReglagesFamilles {
  /** Les nombres dont on affiche la famille, de 2 à 10 : une page chacun. */
  nombres: number[];
  /** 0 + 7 et 7 + 0 au premier étage. */
  avecZero: boolean;
  /** « 4 + 3 = 7 », ou « 7 = 4 + 3 ». */
  ecriture: "somme" | "decomposition";
  /** Le titre de chaque page, avant le nombre. */
  titre: string;
}

export const NOMBRES_DES_FAMILLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
export const TITRE_DES_FAMILLES = "La famille du";
export const REGLAGES_FAMILLES: ReglagesFamilles = { nombres: [7, 8, 9], avecZero: false, ecriture: "somme", titre: TITRE_DES_FAMILLES };

/** Des réglages lus de la mémoire, sans leur faire confiance ; sans nombre, ceux de l'exemple. */
export function reglagesFamillesSurs(brut: Partial<ReglagesFamilles> | null | undefined): ReglagesFamilles {
  const b = brut ?? {};
  const nombres = [...new Set((Array.isArray(b.nombres) ? b.nombres : [])
    .filter((n): n is number => typeof n === "number" && NOMBRES_DES_FAMILLES.includes(n)))].sort((x, y) => x - y);
  return {
    nombres: nombres.length ? nombres : REGLAGES_FAMILLES.nombres,
    avecZero: b.avecZero === true,
    ecriture: b.ecriture === "decomposition" ? "decomposition" : "somme",
    titre: typeof b.titre === "string" && b.titre.trim() ? b.titre.trim() : TITRE_DES_FAMILLES,
  };
}

/** Les étages de la maison : chaque décomposition une fois, la plus petite partie d'abord — 1 et 6, 2 et 5, 3 et 4. */
export function decompositions(n: number, avecZero = false): [number, number][] {
  const sortie: [number, number][] = [];
  for (let a = avecZero ? 0 : 1; a <= n - a; a++) sortie.push([a, n - a]);
  return sortie;
}

/** « La famille du 7 » ; « Les familles du 7, du 8 et du 9 » — un autre titre garde sa forme : « La maison du 7, 8 et 9 ». */
export function titreFamilles(r: Pick<ReglagesFamilles, "nombres" | "titre">): string {
  const titre = r.titre.trim() || TITRE_DES_FAMILLES;
  if (r.nombres.length === 1) return `${titre} ${r.nombres[0]}`;
  const liste = (mots: string[]) => `${mots.slice(0, -1).join(", ")} et ${mots[mots.length - 1]}`;
  return titre === TITRE_DES_FAMILLES
    ? `Les familles ${liste(r.nombres.map((n) => `du ${n}`))}`
    : `${titre} ${liste(r.nombres.map(String))}`;
}

const NOIR = "#1c2233";
const n2 = (v: number) => String(Math.round(v * 100) / 100);

/**
 * La maison remplit la page : moins elle a d'étages, plus ils sont hauts, et
 * plus les billes et les chiffres sont gros — ce qui se lit du fond de la
 * classe. Sous le titre et le toit, 186 mm restent aux étages ; une bille ne
 * prend pas plus du tiers d'un étage, et une ligne de billes tient dans les
 * 80 mm d'une case.
 */
const HAUTEUR_DES_ETAGES = 186, LARGEUR_DES_BILLES = 80, ECART = 6;
const mesures = (n: number, etages: number) => {
  const hauteur = HAUTEUR_DES_ETAGES / etages;
  const pas = Math.min(12, (LARGEUR_DES_BILLES - ECART) / Math.max(1, n), (hauteur * 0.3) / 0.8);
  return { pas, ecrit: Math.min(18, hauteur * 0.3) };
};

/** Les billes d'un étage, en une ligne : les bleues, un trait, les rouges. */
function billes(a: number, b: number, pas: number): string {
  const r = pas * 0.4, haut = pas * 0.9;
  const largeur = (a + b) * pas + ECART;
  const rang = (n: number, x0: number, hex: string) => Array.from({ length: n }, (_, i) => bille(x0 + i * pas + pas / 2, haut / 2, r, hex)).join("");
  const trait = a * pas + ECART / 2;
  return `<svg class="fa-billes" viewBox="0 0 ${n2(largeur)} ${n2(haut)}" style="width:${n2(largeur)}mm;height:${n2(haut)}mm">`
    + rang(a, 0, BILLE_BLEUE)
    + `<line x1="${n2(trait)}" y1="0.3" x2="${n2(trait)}" y2="${n2(haut - 0.3)}" stroke="${NOIR}" stroke-width="0.4" stroke-dasharray="1 1"/>`
    + rang(b, a * pas + ECART, BILLE_ROUGE) + "</svg>";
}

/** Une décomposition : ses billes, puis son écriture, chaque partie à la couleur de ses billes. */
function etage(a: number, b: number, n: number, ecriture: ReglagesFamilles["ecriture"], pas: number): string {
  const parties = `<span class="fa-a">${a}</span> + <span class="fa-b">${b}</span>`;
  return `<div class="fa-case">${billes(a, b, pas)}<div class="fa-ecrit">${ecriture === "somme" ? `${parties} = ${n}` : `${n} = ${parties}`}</div></div>`;
}

/** Le toit : ses deux pentes au-dessus des murs, le nombre dessous. */
const toit = (n: number) => `<svg class="fa-toit" viewBox="0 0 180 44" style="width:180mm;height:44mm">`
  + `<path d="M0 44 L90 2 L180 44 Z" fill="#fff4dc"/>`
  + `<polyline points="0,44 90,2 180,44" fill="none" stroke="${NOIR}" stroke-width="1.2" stroke-linejoin="round"/>`
  + `<text x="90" y="38" font-size="30" font-weight="800" text-anchor="middle" fill="${NOIR}">${n}</text></svg>`;

/** La maison d'un nombre : un étage par décomposition, l'autre sens à côté ; le double, seul à son étage. */
function maison(n: number, r: ReglagesFamilles): string {
  const liste = decompositions(n, r.avecZero);
  const { pas, ecrit } = mesures(n, liste.length);
  const etages = liste.map(([a, b]) => (a === b
    ? `<div class="fa-etage fa-double">${etage(a, b, n, r.ecriture, pas)}</div>`
    : `<div class="fa-etage">${etage(a, b, n, r.ecriture, pas)}${etage(b, a, n, r.ecriture, pas)}</div>`)).join("");
  return `<div class="page fa-page"><div class="fa-titre">${escapeHtml(r.titre)} ${n}</div>${toit(n)}`
    + `<div class="fa-maison" style="--fa-ecrit:${n2(ecrit)}mm">${etages}</div></div>`;
}

/** L'affichage : une maison par nombre, chacune sur sa page. */
export function htmlFamilles(brut: Partial<ReglagesFamilles>): string {
  const r = reglagesFamillesSurs(brut);
  return feuille(r.nombres.map((n) => maison(n, r)).join(""), "fa");
}

// La page fait la hauteur utile de l'A4 — 269 mm entre les marges de 14 mm, moins la marge du corps du document
// imprimable (28 px en haut et en bas) — et un peu moins, pour ne jamais déborder sur la suivante.
export const STYLE_FAMILLES = `
  .feuille.fa .fa-page { display: flex; flex-direction: column; align-items: center; height: 250mm; box-sizing: border-box; }
  .feuille.fa .fa-titre { font-size: 9mm; font-weight: 800; line-height: 1.2; margin: 0 0 3mm; text-align: center; }
  .feuille.fa .fa-toit { display: block; flex: none; }
  .feuille.fa .fa-maison { width: 180mm; flex: 1; display: flex; flex-direction: column; box-sizing: border-box;
    border: 1.2mm solid ${NOIR}; border-radius: 0 0 2mm 2mm; background: #fff; }
  .feuille.fa .fa-etage { flex: 1; display: grid; grid-template-columns: 1fr 1fr; break-inside: avoid; page-break-inside: avoid; }
  .feuille.fa .fa-etage + .fa-etage { border-top: 0.5mm solid #c9cfdc; }
  .feuille.fa .fa-etage.fa-double { grid-template-columns: 1fr; }
  .feuille.fa .fa-case { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3mm; padding: 2mm; }
  .feuille.fa .fa-case + .fa-case { border-left: 0.5mm dashed #c9cfdc; }
  .feuille.fa .fa-billes { display: block; }
  .feuille.fa .fa-ecrit { font-size: var(--fa-ecrit, 12mm); font-weight: 800; line-height: 1; white-space: nowrap; color: ${NOIR}; }
  .feuille.fa .fa-a { color: ${BILLE_BLEUE}; }
  .feuille.fa .fa-b { color: ${BILLE_ROUGE}; }
`;
