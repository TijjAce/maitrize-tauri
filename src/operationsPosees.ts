// Les opérations posées, dans un quadrillage.
//
// Programme de mathématiques du cycle 2 (2024) et guide « Pour enseigner les
// nombres, le calcul et la résolution de problèmes au CP » (Éduscol, 2021) :
// l'addition posée au CP, en période 4 ou 5 — « on aligne les unités sous les
// unités, les dizaines sous les dizaines », la retenue justifiée par la
// numération, les calculs avec et sans retenue traités ensemble, puis trois
// termes dont un nombre à un chiffre ; au CE1, des nombres jusqu'à 1 000 et
// la soustraction posée en période 3 ; au CE2, jusqu'à 10 000, des montants
// en euros, et la multiplication posée en période 4 — « avec le nombre ayant
// le moins de chiffres sur la deuxième ligne ».
//
// Chaque opération a son quadrillage : une case par chiffre, une ligne pour
// les retenues, la barre, le résultat ; posée d'avance, ou à poser par
// l'élève à partir de l'écriture en ligne. Le corrigé remplit les cases.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard } from "./hasard";

export type OperationPosee = "+" | "−" | "×";
export type Retenue = "sans" | "avec" | "melange";

export interface ReglagesPosees {
  operation: OperationPosee;
  /** Les chiffres des nombres : 2, 3 ou 4. */
  chiffres: number;
  /** Le second facteur d'une multiplication : un ou deux chiffres. */
  chiffresDuSecond: 1 | 2;
  /** Des additions de trois termes, dont un nombre à un chiffre. */
  troisTermes: boolean;
  retenue: Retenue;
  combien: number;
  /** Les nombres déjà placés dans le quadrillage ; sinon, l'élève pose l'opération. */
  posees: boolean;
  /** Des montants en euros, avec la virgule (additions et soustractions). */
  euros: boolean;
}

export const REGLAGES_POSEES: ReglagesPosees = {
  operation: "+", chiffres: 2, chiffresDuSecond: 1, troisTermes: false, retenue: "melange", combien: 6, posees: true, euros: false,
};

export interface Posee { termes: number[]; operation: OperationPosee; resultat: number }

const chiffresDe = (n: number) => String(Math.abs(Math.round(n))).split("").map(Number);
const entre = (alea: () => number, a: number, b: number) => a + Math.floor(alea() * (b - a + 1));

/** Une retenue à l'addition (ou un cassage à la soustraction), rang par rang. */
function aUneRetenue(termes: number[], operation: OperationPosee): boolean {
  if (operation === "×") return termes[1] > 1 && chiffresDe(termes[0]).some((c) => c * (termes[1] % 10) >= 10);
  for (let rang = 0, p = 1; rang < 6; rang++, p *= 10) {
    const chiffres = termes.map((t) => Math.floor(t / p) % 10);
    if (operation === "+" && chiffres.reduce((s, c) => s + c, 0) >= 10) return true;
    if (operation === "−" && chiffres[1] > chiffres[0]) return true;
  }
  return false;
}

/** Des opérations posées, toutes différentes, avec ou sans retenue comme on l'a demandé — une sur deux quand on mélange. */
export function operationsPosees(r: ReglagesPosees, graine: number): Posee[] {
  const alea = hasard(graine);
  const chiffres = Math.max(2, Math.min(4, r.chiffres));
  const max = 10 ** chiffres - 1, min = 10 ** (chiffres - 1);
  const sortie: Posee[] = [];
  const vues = new Set<string>();
  for (let garde = 0; sortie.length < Math.max(1, Math.min(12, r.combien)) && garde < 3000; garde++) {
    let termes: number[];
    if (r.operation === "×") {
      // Un second facteur à deux chiffres qui ne soit pas une dizaine entière : chaque ligne a son produit.
      const second = r.chiffresDuSecond === 2 ? entre(alea, 11, 39) : entre(alea, 2, 9);
      if (second % 10 === 0) continue;
      termes = [entre(alea, min, Math.min(max, 999)), second];
    } else if (r.operation === "−") {
      const a = entre(alea, min + 10, max), b = entre(alea, chiffres > 2 && alea() < 0.3 ? 10 ** (chiffres - 2) : min, a - 1);
      termes = [a, b];
    } else {
      termes = [entre(alea, min, max), entre(alea, chiffres > 2 && alea() < 0.3 ? 10 ** (chiffres - 2) : min, max)];
      if (r.troisTermes) termes.splice(1, 0, entre(alea, 2, 9));
    }
    const retenue = aUneRetenue(termes, r.operation);
    const voulue = r.retenue === "melange" ? sortie.length % 2 === 1 : r.retenue === "avec";
    if (retenue !== voulue) continue;
    const resultat = r.operation === "+" ? termes.reduce((s, t) => s + t, 0) : r.operation === "−" ? termes[0] - termes[1] : termes[0] * termes[1];
    if (r.euros && r.operation !== "×" && resultat > 99999) continue;
    // Le champ des nombres du CE2 : jusqu'à 10 000.
    if (r.operation === "×" && resultat > 10000) continue;
    const cle = `${termes.join(r.operation)}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    sortie.push({ termes, operation: r.operation, resultat });
  }
  return sortie;
}

/** Un nombre en lettres de chiffres, avec la virgule des centimes quand ce sont des euros. */
const enCases = (n: number, euros: boolean): string[] => {
  if (!euros) return chiffresDe(n).map(String);
  const c = String(Math.round(n)).padStart(3, "0");
  return [...c.slice(0, -2).split(""), ",", ...c.slice(-2).split("")];
};
export const enLigne = (n: number, euros: boolean) => (euros ? `${enCases(n, true).join("")} €` : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "));

/** Les retenues de l'addition, rang par rang, de droite à gauche. */
function retenuesDe(termes: number[]): number[] {
  const sortie: number[] = [];
  let retenue = 0;
  for (let p = 1; p <= 10 ** 6; p *= 10) {
    const somme = termes.reduce((s, t) => s + (Math.floor(t / p) % 10), 0) + retenue;
    retenue = Math.floor(somme / 10);
    sortie.push(retenue);
  }
  return sortie;
}

/**
 * Le quadrillage d'une opération : une colonne pour le signe, une par chiffre ;
 * une ligne de retenues au-dessus, les termes, la barre, le résultat — et pour
 * une multiplication par deux chiffres, les deux produits partiels.
 */
function quadrillage(o: Posee, euros: boolean, posee: boolean, corrige: boolean): string {
  const lignesTermes = o.termes.map((t) => enCases(t, euros));
  const resultat = enCases(o.resultat, euros);
  const partiels = o.operation === "×" && o.termes[1] >= 10
    ? [o.termes[0] * (o.termes[1] % 10), o.termes[0] * Math.floor(o.termes[1] / 10) * 10].map((p) => enCases(p, false)) : [];
  const largeur = Math.max(resultat.length, ...lignesTermes.map((l) => l.length), ...partiels.map((l) => l.length)) + 1;
  const ligne = (cases: string[], signe = "", classe = "") => {
    const vide = largeur - cases.length - 1;
    return `<tr class="${classe}"><td class="op-signe">${signe}</td>${'<td></td>'.repeat(Math.max(0, vide))}${cases.map((c) => `<td${c === "," ? ' class="op-virgule"' : ""}>${c}</td>`).join("")}</tr>`;
  };
  const vides = (n: number) => Array.from({ length: n }, () => "");
  const retenues = o.operation === "+" ? retenuesDe(o.termes) : [];
  const caseRetenue = (i: number) => {
    // La retenue d'un rang s'écrit au-dessus du rang suivant, à sa gauche ; avec la virgule des euros, l'élève la place.
    if (euros) return "";
    const rang = largeur - 2 - i;
    const r = rang >= 1 ? retenues[rang - 1] : 0;
    return corrige && r ? String(r) : "";
  };
  const ligneRetenues = `<tr class="op-retenues"><td></td>${Array.from({ length: largeur - 1 }, (_, i) => `<td>${caseRetenue(i)}</td>`).join("")}</tr>`;
  const montrer = posee || corrige;
  const termes = lignesTermes.map((l, i) => ligne(montrer ? l : vides(l.length), i === lignesTermes.length - 1 ? (montrer ? o.operation : "") : "", i === lignesTermes.length - 1 ? "op-dernier" : ""));
  const produits = partiels.length
    ? partiels.map((p, i) => ligne(corrige ? p : vides(p.length), i === 1 ? "+" : "", i === partiels.length - 1 ? "op-dernier" : "")).join("") : "";
  return `<table class="op-grille">${o.operation === "+" ? ligneRetenues : ""}${termes.join("")}${produits}${ligne(corrige ? resultat : vides(resultat.length))}</table>`;
}

export function htmlOperationsPosees(r: ReglagesPosees, graine: number): string {
  const ops = operationsPosees(r, graine);
  const euros = r.euros && r.operation !== "×";
  const nom = r.operation === "+" ? "additions" : r.operation === "−" ? "soustractions" : "multiplications";
  const enLigneDe = (o: Posee) => `${o.termes.map((t) => enLigne(t, euros)).join(` ${o.operation} `)}`;
  const bloc = (o: Posee, corrige: boolean) => `<div class="op-bloc">${!r.posees || corrige ? `<div class="op-enligne">${escapeHtml(enLigneDe(o))}${corrige ? ` = <b>${escapeHtml(enLigne(o.resultat, euros))}</b>` : ""}</div>` : ""}
    ${quadrillage(o, euros, r.posees, corrige)}</div>`;
  const regle = r.operation === "×"
    ? "On pose le nombre qui a le moins de chiffres sur la deuxième ligne. On multiplie chaque chiffre, en commençant par les unités ; avec deux chiffres, une ligne pour les unités, une pour les dizaines."
    : r.operation === "−"
      ? "On aligne les unités sous les unités, les dizaines sous les dizaines… On commence par les unités ; s'il n'y a pas assez d'unités, on casse une dizaine — celle de l'algorithme choisi par l'école."
      : "On aligne les unités sous les unités, les dizaines sous les dizaines… On commence par les unités ; dix unités font une dizaine, qu'on met en retenue.";
  return feuille(`<div class="page"><div class="titre">Opérations posées — ${nom}</div>
    <div class="sous">Prénom : ........................................ Date : ........................</div>
    <div class="regle"><b>${r.posees ? "Calcule" : "Pose, puis calcule"}</b>${regle} <span class="reference">Programme 2024 ; guide CP, Éduscol 2021.</span></div>
    <div class="op-liste">${ops.map((o) => bloc(o, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">Opérations posées — corrigé</div><div class="op-liste">${ops.map((o) => bloc(o, true)).join("")}</div></div>`, "op");
}

export const STYLE_POSEES = `
  .feuille.op .op-liste { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm 8mm; }
  .feuille.op .op-bloc { page-break-inside: avoid; break-inside: avoid; }
  .feuille.op .op-enligne { font-size: 15px; font-weight: 600; margin: 0 0 2mm; }
  .feuille.op .op-grille { border-collapse: collapse; font-size: 18px; font-weight: 600; }
  .feuille.op .op-grille td { width: 7mm; height: 8mm; text-align: center; border: 0.6px solid #c4c9d6; }
  .feuille.op .op-grille td.op-signe { border-color: transparent; font-weight: 700; }
  .feuille.op .op-grille td.op-virgule { width: 3mm; }
  .feuille.op .op-grille tr.op-retenues td { height: 5mm; font-size: 11px; color: #d33a32; border-style: dashed; }
  .feuille.op .op-grille tr.op-dernier td { border-bottom: 2px solid #1c2233; }
`;
