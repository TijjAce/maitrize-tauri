// Les mots mêlés.
//
// Les mots de la semaine — ceux de la dictée, du thème, de la leçon — cachés
// dans une grille de lettres. Au cycle 2, de gauche à droite et de haut en
// bas, en capitales ; au cycle 3, en diagonale et à l'envers aussi. La liste
// des mots s'imprime à côté, avec leurs accents ; dans la grille, les lettres
// n'en ont pas, comme dans tous les mots mêlés.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard } from "./hasard";
import { choisir, entier } from "./nombres";

export interface ReglagesMotsMeles {
  /** Les mots, un par ligne. */
  mots: string;
  taille: number;
  diagonales: boolean;
  inverses: boolean;
  capitales: boolean;
  /** La liste des mots à retrouver, imprimée sous la grille. */
  liste: boolean;
  /** Plusieurs grilles des mêmes mots, placés autrement : une par élève voisin. */
  grilles: number;
}
export const REGLAGES_MOTS_MELES: ReglagesMotsMeles = {
  mots: "chat\nchien\nlapin\ncheval\npoule\nvache\ncanard\nmouton\ncochon\nâne", taille: 10, diagonales: false, inverses: false, capitales: true, liste: true, grilles: 1,
};

export interface MotPlace { mot: string; lettres: string; x: number; y: number; dx: number; dy: number }
export interface GrilleMeles { taille: number; cases: string[][]; places: MotPlace[]; oublies: string[] }

/** Les mots saisis : un par ligne ou séparés par des virgules, sans doublon. */
export function motsSaisis(texte: string): string[] {
  const vus = new Set<string>();
  return (texte ?? "").split(/[\n,;]+/).map((m) => m.trim()).filter((m) => {
    const cle = lettresDuMot(m);
    if (!cle || vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
}

/** « grand-père » → « GRANDPERE » : les lettres de la grille, sans accent ni tiret. */
export const lettresDuMot = (mot: string) => mot.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/gi, "OE").replace(/[^a-zA-Z]/g, "").toUpperCase();

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function grilleMotsMeles(mots: string[], r: ReglagesMotsMeles, graine: number): GrilleMeles {
  const alea = hasard(graine);
  const propres = mots.map((mot) => ({ mot, lettres: lettresDuMot(mot) })).filter((m) => m.lettres.length >= 2);
  const taille = Math.min(20, Math.max(5, r.taille, ...propres.map((m) => m.lettres.length)));
  const cases: string[][] = Array.from({ length: taille }, () => Array.from({ length: taille }, () => ""));
  let directions: [number, number][] = [[1, 0], [0, 1]];
  if (r.diagonales) directions = [...directions, [1, 1], [1, -1]];
  if (r.inverses) directions = directions.flatMap(([dx, dy]) => [[dx, dy], [-dx, -dy]] as [number, number][]);
  const places: MotPlace[] = [];
  const oublies: string[] = [];
  // Les longs d'abord : ce sont eux qui manquent de place.
  for (const m of [...propres].sort((a, b) => b.lettres.length - a.lettres.length)) {
    let pose = false;
    for (let essai = 0; essai < 400 && !pose; essai++) {
      const [dx, dy] = choisir(alea, directions);
      const x = entier(alea, 0, taille - 1), y = entier(alea, 0, taille - 1);
      const fx = x + dx * (m.lettres.length - 1), fy = y + dy * (m.lettres.length - 1);
      if (fx < 0 || fy < 0 || fx >= taille || fy >= taille) continue;
      let libre = true;
      for (let i = 0; i < m.lettres.length && libre; i++) {
        const c = cases[y + dy * i][x + dx * i];
        if (c && c !== m.lettres[i]) libre = false;
      }
      if (!libre) continue;
      for (let i = 0; i < m.lettres.length; i++) cases[y + dy * i][x + dx * i] = m.lettres[i];
      places.push({ ...m, x, y, dx, dy });
      pose = true;
    }
    if (!pose) oublies.push(m.mot);
  }
  for (const ligne of cases) for (let x = 0; x < taille; x++) if (!ligne[x]) ligne[x] = ALPHABET[Math.floor(alea() * 26)];
  return { taille, cases, places, oublies };
}

/** Les cases occupées par les mots placés, pour le corrigé. */
export function casesDesMots(g: GrilleMeles): Set<string> {
  const s = new Set<string>();
  for (const m of g.places) for (let i = 0; i < m.lettres.length; i++) s.add(`${m.x + m.dx * i},${m.y + m.dy * i}`);
  return s;
}

function grilleHtml(g: GrilleMeles, r: ReglagesMotsMeles, corrige: boolean): string {
  const trouvees = corrige ? casesDesMots(g) : new Set<string>();
  const lettre = (c: string) => (r.capitales ? c : c.toLowerCase());
  return `<table class="mm-grille">${g.cases.map((ligne, y) => `<tr>${ligne.map((c, x) => `<td${trouvees.has(`${x},${y}`) ? ' class="mm-trouve"' : ""}>${lettre(c)}</td>`).join("")}</tr>`).join("")}</table>`;
}

export function htmlMotsMeles(grilles: GrilleMeles[], r: ReglagesMotsMeles): string {
  const sens = ["de gauche à droite et de haut en bas", r.diagonales ? "en diagonale" : "", r.inverses ? "et parfois à l'envers" : ""].filter(Boolean).join(", ");
  const regle = `<div class="titre">Mots mêlés</div><div class="regle"><b>La règle</b>Retrouve les mots de la liste cachés dans la grille : ils se lisent ${sens}. Entoure chaque mot trouvé, puis barre-le dans la liste.</div>`;
  const liste = (g: GrilleMeles) => (r.liste ? `<div class="mm-liste">${g.places.map((m) => m.mot).sort((a, b) => a.localeCompare(b, "fr")).map((m) => `<span>${escapeHtml(r.capitales ? m.toLocaleUpperCase("fr") : m)}</span>`).join("")}</div>` : "");
  const pages = grilles.map((g, i) => `<div class="page">${regle}${grilles.length > 1 ? `<div class="sous">Grille ${i + 1}</div>` : ""}${grilleHtml(g, r, false)}${liste(g)}</div>`);
  const corriges = grilles.map((g, i) => `<div class="page corrige"><div class="titre">Mots mêlés — corrigé${grilles.length > 1 ? ` de la grille ${i + 1}` : ""}</div>${grilleHtml(g, r, true)}</div>`);
  return feuille(pages.join("") + corriges.join(""), "mm");
}

export const STYLE_MOTS_MELES = `
  .feuille.mm .mm-grille { border-collapse: collapse; margin: 2mm auto 4mm; }
  .feuille.mm .mm-grille td { width: 8mm; height: 8mm; border: 1px solid #9aa0b4; text-align: center; font-size: 15px; font-weight: 700; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
  .feuille.mm .mm-grille td.mm-trouve { background: #cfe8d9; }
  .feuille.mm .mm-liste { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5mm 4mm; font-size: 14px; font-weight: 600; }
`;
