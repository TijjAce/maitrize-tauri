// La grille de fluence et le syllabaire : ce que les livrets de lecture
// font lire chaque jour de la semaine.
//
// Livrets Français CP (2025) et CE1 (2026) : une grille de syllabes, de
// pseudo-mots et de mots pour le graphème de la semaine, lue chaque jour,
// chronométrée, le score noté ; et pour s'entraîner en autonomie, le jeu des
// quatre jetons alignés, le syllabaire, le jeu de l'ascenseur.

import { escapeHtml } from "./print";
import { hasard, melanger } from "./hasard";
import { SONS, contientLeSon, lireMesMots, sonDe, syllabes, type Son } from "./lectureSons";
import { feuille } from "./cartesImprimables";

export type ContenuFluence = "syllabes" | "mots" | "mixte";

export interface ReglagesFluence {
  son: string;
  contenu: ContenuFluence;
  lignes: number;
  mesMots: string;
  /** La grille devient un plateau : quatre jetons alignés. */
  puissance4: boolean;
}

export const REGLAGES_FLUENCE: ReglagesFluence = { son: "ch", contenu: "mixte", lignes: 6, mesMots: "", puissance4: false };

const COLONNES = 5;

/** Des pseudo-mots : une syllabe du son et une syllabe simple, dans un ordre ou l'autre. */
export function pseudoMots(son: Son, combien: number, r: () => number): string[] {
  const miennes = syllabes(son, 8);
  const simples = ["ma", "li", "ro", "tu", "pé", "sa", "vi", "no", "fu", "dé", "la", "mi", "po", "ru"];
  const sortie = new Set<string>();
  let garde = 0;
  while (sortie.size < combien && garde++ < 200) {
    const a = miennes[Math.floor(r() * miennes.length)];
    const b = simples[Math.floor(r() * simples.length)];
    const mot = r() < 0.5 ? `${a}${b}` : `${b}${a}`;
    if (!son.mots.includes(mot)) sortie.add(mot);
  }
  return [...sortie];
}

export interface GrilleFluence {
  son: Son;
  lignes: string[][];
  /** Le nombre d'items lus à la fin de chaque ligne, pour compter vite. */
  cumul: number[];
}

export function grilleFluence(r: ReglagesFluence, graine: number): GrilleFluence {
  const son = sonDe(r.son) ?? SONS[0];
  const alea = hasard(graine);
  const miens = lireMesMots(r.mesMots).filter((m) => contientLeSon(m, son));
  const mots = melanger(alea, [...new Set([...miens, ...son.mots])]);
  const syl = melanger(alea, syllabes(son, 10));
  const pseudos = pseudoMots(son, 12, alea);
  const total = r.lignes * COLONNES;
  const prendre = (liste: string[], n: number) => Array.from({ length: n }, (_, i) => liste[i % Math.max(1, liste.length)]);
  let items: string[];
  if (r.contenu === "syllabes") items = melanger(alea, [...prendre(syl, Math.ceil(total * 0.7)), ...prendre(pseudos, Math.floor(total * 0.3))]).slice(0, total);
  else if (r.contenu === "mots") items = prendre(melanger(alea, mots), total);
  else items = melanger(alea, [...prendre(syl, Math.ceil(total * 0.4)), ...prendre(pseudos, Math.ceil(total * 0.2)), ...prendre(mots, Math.ceil(total * 0.4))]).slice(0, total);
  const lignes: string[][] = [];
  for (let i = 0; i < total; i += COLONNES) lignes.push(items.slice(i, i + COLONNES));
  const cumul = lignes.map((_, i) => (i + 1) * COLONNES);
  return { son, lignes, cumul };
}

export function htmlFluence(g: GrilleFluence, r: ReglagesFluence): string {
  const titre = `Grille de fluence — le son ${g.son.son}`;
  const grille = `<table class="fl-grille"><tbody>${g.lignes.map((l, i) =>
    `<tr>${l.map((x) => `<td>${escapeHtml(x)}</td>`).join("")}<td class="fl-cumul">${g.cumul[i]}</td></tr>`).join("")}</tbody></table>`;
  const score = `<table class="fl-score"><thead><tr><th></th><th>Jour 1</th><th>Jour 2</th><th>Jour 3</th><th>Jour 4</th></tr></thead><tbody>
    <tr><th>Items lus en 1 minute</th><td></td><td></td><td></td><td></td></tr>
    <tr><th>Erreurs</th><td></td><td></td><td></td><td></td></tr>
    <tr><th>Score (lus − erreurs)</th><td></td><td></td><td></td><td></td></tr></tbody></table>`;
  const consigne = `<div class="regle"><b>Chaque jour de la semaine</b>Je lis la grille le plus vite possible, sans erreur ; on note mon score.
    Le lendemain, je recommence et je regarde mes progrès. En trinôme : un lecteur, un chronométreur, un vérificateur.
    <span style="color:#687087">— Livrets Français CP (2025) et CE1 (2026), Éduscol.</span></div>`;
  let plateau = "";
  if (r.puissance4) {
    const pool = g.lignes.flat().filter((x) => x.length <= 4);
    const cases = Array.from({ length: 42 }, (_, i) => pool.length ? pool[i % pool.length] : "");
    plateau = `<div class="page"><div class="titre">Quatre jetons alignés — le son ${escapeHtml(g.son.son)}</div>
      <div class="regle"><b>Règle du jeu</b>Les joueurs ont des jetons de deux couleurs. Le premier joueur lit une syllabe et place son jeton sur la syllabe lue.
        Le deuxième joueur fait de même, et ainsi de suite. Le premier joueur qui a aligné quatre jetons a gagné.
        <span style="color:#687087">— Livret Français CP, Éduscol 2025.</span></div>
      <table class="fl-plateau"><tbody>${Array.from({ length: 6 }, (_, l) =>
        `<tr>${cases.slice(l * 7, l * 7 + 7).map((x) => `<td>${escapeHtml(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  return feuille(`<div class="page"><div class="titre">${escapeHtml(titre)}</div><div class="sous">Prénom : ........................................ Date : ........................</div>${consigne}${grille}${score}</div>${plateau}`, "fl");
}

// ── Le syllabaire, ou jeu de l'ascenseur ──────────────────────────────────
//
// Livret Français CE1 (2026) : « les élèves jouent au jeu de l'ascenseur ou
// utilisent le syllabaire pour réviser des graphèmes étudiés précédemment ».
// Deux bandes qu'on fait glisser dans un cadre : une consonne, une voyelle,
// et la syllabe apparaît dans la fenêtre.

export const CONSONNES_SYLLABAIRE = ["m", "l", "r", "s", "p", "t", "v", "f", "n", "d", "b", "ch", "j", "c", "g", "z"];
export const VOYELLES_SYLLABAIRE = ["a", "i", "o", "u", "e", "é", "ou", "on", "an", "in", "oi", "eu"];

export interface ReglagesSyllabaire { consonnes: string[]; voyelles: string[] }
export const REGLAGES_SYLLABAIRE: ReglagesSyllabaire = { consonnes: CONSONNES_SYLLABAIRE.slice(0, 10), voyelles: VOYELLES_SYLLABAIRE.slice(0, 6) };

export function htmlSyllabaire(r: ReglagesSyllabaire): string {
  const bande = (liste: string[], titre: string) => `<div class="sy-bande"><div class="sy-bande-titre">${titre}</div>${liste.map((x) => `<div class="sy-cell">${escapeHtml(x)}</div>`).join("")}</div>`;
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
  .feuille.fl .fl-grille td { border: 1px solid #9aa0b4; font-size: 22px; padding: 4mm 2mm; text-align: center; letter-spacing: .5px; }
  .feuille.fl .fl-grille td.fl-cumul { border: none; font-size: 11px; color: #687087; width: 10mm; text-align: right; }
  .feuille.fl .fl-score { border-collapse: collapse; width: 100%; }
  .feuille.fl .fl-score th, .feuille.fl .fl-score td { border: 1px solid #9aa0b4; padding: 3mm; font-size: 12px; text-align: left; }
  .feuille.fl .fl-score th { background: #f0f2f8; }
  .feuille.fl .fl-plateau { border-collapse: collapse; margin: 4mm auto; }
  .feuille.fl .fl-plateau td { border: 1.5px solid #1c2233; width: 24mm; height: 24mm; text-align: center; font-size: 20px; font-weight: 600; }
  .feuille.sy .sy-cadre { display: flex; gap: 6mm; border: 2px solid #1c2233; border-radius: 3mm; padding: 8mm 12mm; width: 120mm; justify-content: center; }
  .feuille.sy .sy-fenetre { display: flex; flex-direction: column; align-items: center; gap: 1mm; }
  .feuille.sy .sy-fente { width: 24mm; border-top: 3px solid #1c2233; }
  .feuille.sy .sy-vue { width: 22mm; height: 16mm; border: 1.5px dashed #9aa0b4; }
  .feuille.sy .sy-bandes { display: flex; gap: 14mm; margin-top: 8mm; }
  .feuille.sy .sy-bande { border: 1px dashed #9aa0b4; width: 22mm; }
  .feuille.sy .sy-bande-titre { font-size: 9px; color: #687087; text-align: center; padding: 1mm; }
  .feuille.sy .sy-cell { height: 16mm; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; border-top: 1px dotted #c4c9d6; }
`;
