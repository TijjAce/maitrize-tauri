// La grille de fluence et le syllabaire : ce que les livrets de lecture
// font lire chaque jour de la semaine.
//
// Livrets Français CP (2025) et CE1 (2026) : une grille de syllabes, de
// pseudo-mots et de mots pour le graphème de la semaine, lue chaque jour,
// chronométrée, le score noté ; et pour s'entraîner en autonomie, le jeu des
// quatre jetons alignés, le syllabaire, le jeu de l'ascenseur.
//
// Le graphème de la semaine est une étape de la progression des guides CP et
// CE1 (progressionCgp.ts) : la grille ne donne à lire que ce qui a déjà été
// étudié à cette étape.

import { escapeHtml } from "./print";
import { hasard, melanger } from "./hasard";
import { lireMesMots } from "./lectureSons";
import { feuille } from "./cartesImprimables";
import { MOTS_DECHIFFRABLES } from "./motsDechiffrables";
import { ETAPE_PAR_DEFAUT, etapeDe, motsDe, periodeDe, pseudoMotsDe, syllabesDe, type EtapeCgp, type MotEnAttente } from "./progressionCgp";

export type ContenuFluence = "syllabes" | "mots" | "mixte";

export interface ReglagesFluence {
  /** L'étape de la progression des guides (« p2-ch ») ; un ancien réglage y nommait le son (« ch »), qu'on retrouve. */
  son: string;
  contenu: ContenuFluence;
  lignes: number;
  mesMots: string;
  /** La grille devient un plateau : quatre jetons alignés. */
  puissance4: boolean;
}

export const REGLAGES_FLUENCE: ReglagesFluence = { son: ETAPE_PAR_DEFAUT, contenu: "mixte", lignes: 6, mesMots: "", puissance4: false };

const COLONNES = 5;

/** Le nom de l'étape, sur la feuille et dans la liste : « ch [ʃ] », « an, am [ɑ̃] ». */
export const nomDeLEtape = (e: EtapeCgp) => (e.son && !e.titre.includes("[") ? `${e.titre} ${e.son}` : e.titre);

export interface GrilleFluence {
  etape: EtapeCgp;
  lignes: string[][];
  /** Le nombre d'items lus à la fin de chaque ligne, pour compter vite. */
  cumul: number[];
  /** Les mots de l'enseignant qui entrent dans la grille. */
  miens: string[];
  /** Ceux qui portent le graphème mais demandent ce qu'on n'a pas encore étudié. */
  enAttente: MotEnAttente[];
}

/**
 * Les items, part par part. Une réserve trop petite ne répète pas ses items
 * plus de deux fois si les autres peuvent compléter ; une réserve vide passe
 * sa part aux autres — pas de mots au tout début du CP, pas de syllabes pour
 * « ils chantent ».
 */
function remplir(alea: () => number, total: number, parts: [string[], number][]): string[] {
  const pleines = parts.filter(([l]) => l.length);
  if (!pleines.length) return [];
  const somme = pleines.reduce((s, [, p]) => s + p, 0);
  const prises = pleines.map(([l, p]) => ({ l, n: Math.min(Math.ceil((total * p) / somme), l.length * 2) }));
  let manque = total - prises.reduce((s, x) => s + x.n, 0);
  for (const x of prises) {
    const plus = Math.max(0, Math.min(x.l.length * 2 - x.n, manque));
    x.n += plus;
    manque -= plus;
  }
  if (manque > 0) prises[0].n += manque;
  const items = prises.flatMap(({ l, n }) => Array.from({ length: n }, (_, i) => l[i % l.length]));
  return melanger(alea, items).slice(0, total);
}

export function grilleFluence(r: ReglagesFluence, graine: number): GrilleFluence {
  const etape = etapeDe(r.son);
  const alea = hasard(graine);
  const mesMots = lireMesMots(r.mesMots);
  const { miens, corpus, enAttente } = motsDe(etape, mesMots);
  // Les mots de l'enseignant passent devant ceux du corpus.
  const mots = [...melanger(alea, miens), ...melanger(alea, corpus)];
  const syl = melanger(alea, syllabesDe(etape));
  const pseudos = pseudoMotsDe(etape, 12, alea, new Set([...MOTS_DECHIFFRABLES, ...mesMots]));
  const total = r.lignes * COLONNES;
  const tout: [string[], number][] = [[syl, 0.4], [pseudos, 0.2], [mots, 0.4]];
  const parts: [string[], number][] = r.contenu === "syllabes" ? [[syl, 0.7], [pseudos, 0.3]] : r.contenu === "mots" ? [[mots, 1]] : tout;
  let items = remplir(alea, total, parts);
  if (!items.length) items = remplir(alea, total, tout);
  const lignes: string[][] = [];
  for (let i = 0; i < items.length; i += COLONNES) lignes.push(items.slice(i, i + COLONNES));
  const cumul = lignes.map((_, i) => Math.min((i + 1) * COLONNES, items.length));
  return { etape, lignes, cumul, miens, enAttente };
}

/** Les items longs (« ils chantent ») prennent une taille plus petite, pour tenir dans leur case. */
const taille = (x: string) => (x.length > 11 ? ' class="fl-xl"' : x.length > 8 ? ' class="fl-l"' : "");

export function htmlFluence(g: GrilleFluence, r: ReglagesFluence): string {
  const nom = nomDeLEtape(g.etape);
  const periode = periodeDe(g.etape.periode);
  const titre = `Grille de fluence — ${nom}`;
  // À partir de huit lignes, les cases se resserrent : la grille et le tableau des scores tiennent sur une page.
  const grille = `<table class="fl-grille${g.lignes.length >= 8 ? " fl-serree" : ""}"><tbody>${g.lignes.map((l, i) =>
    `<tr>${l.map((x) => `<td${taille(x)}>${escapeHtml(x)}</td>`).join("")}<td class="fl-cumul">${g.cumul[i]}</td></tr>`).join("")}</tbody></table>`;
  const score = `<table class="fl-score"><thead><tr><th></th><th>Jour 1</th><th>Jour 2</th><th>Jour 3</th><th>Jour 4</th></tr></thead><tbody>
    <tr><th>Items lus en 1 minute</th><td></td><td></td><td></td><td></td></tr>
    <tr><th>Erreurs</th><td></td><td></td><td></td><td></td></tr>
    <tr><th>Score (lus − erreurs)</th><td></td><td></td><td></td><td></td></tr></tbody></table>`;
  const consigne = `<div class="regle"><b>Chaque jour de la semaine</b>Je lis la grille le plus vite possible, sans erreur ; on note mon score.
    Le lendemain, je recommence et je regarde mes progrès. En trinôme : un lecteur, un chronométreur, un vérificateur.
    <span style="color:#687087">— Livrets Français CP (2025) et CE1 (2026), Éduscol ; progression du ${escapeHtml(periode.guide)}.</span></div>`;
  let plateau = "";
  if (r.puissance4) {
    const pool = g.lignes.flat().filter((x) => x.length <= 4);
    const cases = Array.from({ length: 42 }, (_, i) => pool.length ? pool[i % pool.length] : "");
    plateau = `<div class="page"><div class="titre">Quatre jetons alignés — ${escapeHtml(nom)}</div>
      <div class="regle"><b>Règle du jeu</b>Les joueurs ont des jetons de deux couleurs. Le premier joueur lit une syllabe et place son jeton sur la syllabe lue.
        Le deuxième joueur fait de même, et ainsi de suite. Le premier joueur qui a aligné quatre jetons a gagné.
        <span style="color:#687087">— Livret Français CP, Éduscol 2025.</span></div>
      <table class="fl-plateau"><tbody>${Array.from({ length: 6 }, (_, l) =>
        `<tr>${cases.slice(l * 7, l * 7 + 7).map((x) => `<td>${escapeHtml(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  return feuille(`<div class="page"><div class="titre">${escapeHtml(titre)}</div>
    <div class="sous fl-etape">${escapeHtml(periode.court)} — ${escapeHtml(g.etape.rubrique.toLocaleLowerCase("fr"))}</div>
    <div class="sous">Prénom : ........................................ Date : ........................</div>${consigne}${grille}${score}</div>${plateau}`, "fl");
}

// ── Le syllabaire, ou jeu de l'ascenseur ──────────────────────────────────
//
// Livret Français CE1 (2026) : « les élèves jouent au jeu de l'ascenseur ou
// utilisent le syllabaire pour réviser des graphèmes étudiés précédemment ».
// Deux bandes qu'on fait glisser dans un cadre : une consonne, une voyelle,
// et la syllabe apparaît dans la fenêtre.

export const CONSONNES_SYLLABAIRE = ["m", "l", "r", "s", "p", "t", "v", "f", "n", "d", "b", "ch", "j", "c", "g", "z"];
export const VOYELLES_SYLLABAIRE = ["a", "i", "o", "u", "e", "é", "ou", "on", "an", "in", "oi", "eu"];

export interface ReglagesSyllabaire {
  consonnes: string[];
  voyelles: string[];
  /** Les lettres en capitales d'imprimerie — l'écriture que beaucoup d'élèves lisent en premier. */
  capitales: boolean;
}
export const REGLAGES_SYLLABAIRE: ReglagesSyllabaire = { consonnes: CONSONNES_SYLLABAIRE.slice(0, 10), voyelles: VOYELLES_SYLLABAIRE.slice(0, 6), capitales: false };

/** Un graphème tel qu'il s'écrit sur la bande : « ch » ou « CH », « é » ou « É ». */
export const grapheme = (x: string, capitales: boolean) => (capitales ? x.toLocaleUpperCase("fr") : x);

export function htmlSyllabaire(r: ReglagesSyllabaire): string {
  const bande = (liste: string[], titre: string) => `<div class="sy-bande"><div class="sy-bande-titre">${titre}</div>${liste.map((x) => `<div class="sy-cell">${escapeHtml(grapheme(x, r.capitales))}</div>`).join("")}</div>`;
  return feuille(`<div class="page"><div class="titre">Syllabaire — le jeu de l'ascenseur</div>
    <div class="regle"><b>Fabrication</b>Découper le cadre et ses quatre fentes (traits épais) ; découper les deux bandes ; les glisser dans les fentes.
      <b style="margin-top:4px">Jeu</b>On fait monter ou descendre une bande : la syllabe apparaît dans la fenêtre, on la lit. Puis l'autre bande, puis les deux.
      <span style="color:#687087">— Livret Français CE1, Éduscol 2026.</span></div>
    <div class="sy-cadre">
      <div class="sy-fenetre"><div class="sy-fente"></div><div class="sy-vue"></div><div class="sy-fente"></div></div>
      <div class="sy-fenetre"><div class="sy-fente"></div><div class="sy-vue"></div><div class="sy-fente"></div></div>
    </div>
    <div class="sous" style="margin-top:4mm">Le cadre : deux fenêtres, la consonne à gauche, la voyelle à droite. Les traits épais sont les fentes.</div>
    <div class="sy-bandes">${bande(r.consonnes, "consonnes")}${bande(r.voyelles, "voyelles")}</div></div>`, "sy");
}

export const STYLE_FLUENCE = `
  .feuille.fl .fl-grille { width: 100%; border-collapse: collapse; margin: 4mm 0 6mm; }
  .feuille.fl .fl-grille td { border: 1px solid #9aa0b4; font-size: 22px; padding: 4mm 2mm; text-align: center; vertical-align: middle; letter-spacing: .5px; }
  .feuille.fl .fl-grille td.fl-cumul { border: none; font-size: 11px; color: #687087; width: 10mm; text-align: right; }
  .feuille.fl .fl-grille.fl-serree td { padding: 2.4mm 2mm; }
  .feuille.fl .fl-grille td.fl-l { font-size: 17px; letter-spacing: 0; }
  .feuille.fl .fl-grille td.fl-xl { font-size: 14px; letter-spacing: 0; }
  .feuille.fl .fl-etape { color: #687087; font-size: 11px; margin-top: -2px; }
  .feuille.fl .fl-score { border-collapse: collapse; width: 100%; }
  .feuille.fl .fl-score th, .feuille.fl .fl-score td { border: 1px solid #9aa0b4; padding: 3mm; font-size: 12px; text-align: left; }
  .feuille.fl .fl-score th { background: #f0f2f8; }
  .feuille.fl .fl-plateau { border-collapse: collapse; margin: 4mm auto; }
  .feuille.fl .fl-plateau td { border: 1.5px solid #1c2233; width: 24mm; height: 24mm; text-align: center; vertical-align: middle; font-size: 20px; font-weight: 600; }
  .feuille.sy .sy-cadre { display: flex; gap: 6mm; border: 2px solid #1c2233; border-radius: 3mm; padding: 8mm 12mm; width: 120mm; justify-content: center; }
  .feuille.sy .sy-fenetre { display: flex; flex-direction: column; align-items: center; gap: 1mm; }
  .feuille.sy .sy-fente { width: 24mm; border-top: 3px solid #1c2233; }
  .feuille.sy .sy-vue { width: 22mm; height: 16mm; border: 1.5px dashed #9aa0b4; }
  .feuille.sy .sy-bandes { display: flex; gap: 14mm; margin-top: 8mm; }
  .feuille.sy .sy-bande { border: 1px dashed #9aa0b4; width: 22mm; }
  .feuille.sy .sy-bande-titre { font-size: 9px; color: #687087; text-align: center; padding: 1mm; }
  .feuille.sy .sy-cell { height: 16mm; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; border-top: 1px dotted #c4c9d6; }
`;
