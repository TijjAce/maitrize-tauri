// Le calcul mental, procédé La Martinière.
//
// Le maître dit un calcul, deux fois ; les élèves réfléchissent sans écrire ;
// « écrivez » — chacun écrit le résultat sur l'ardoise ; « montrez » — les
// ardoises se lèvent ensemble ; on corrige, on passe au suivant. Dix calculs
// font une série, deux ou trois séries une séance. Ce qui se prépare ici : la
// fiche du maître — les calculs et leurs réponses, dans l'ordre où on les
// dira — et les ardoises papier, une case numérotée par calcul, pour ceux
// qui n'ont pas d'ardoise ou pour garder trace.
//
// Les familles suivent les repères de progression du calcul mental : au
// cycle 2, compléments à 10, sommes et différences jusqu'à 20 puis 100,
// doubles et moitiés, dizaines entières, tables de 2, 5, 10 ; au cycle 3,
// tables et divisions, multiplier par 10, 100, 1 000, compléments à 100 et
// à 1 000, et les décimaux simples.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { choisir, entier, fr } from "./nombres";

export type FamilleCalcul =
  | "complements" | "additions" | "soustractions" | "doubles" | "moities" | "dizaines"
  | "tables" | "divisions" | "fois10" | "decimaux";

export const FAMILLES_CALCUL: { id: FamilleCalcul; libelle: string; court: string; cycles: (2 | 3)[] }[] = [
  { id: "complements", libelle: "Compléments à 10, à 100, à 1 000", court: "compléments", cycles: [2, 3] },
  { id: "additions", libelle: "Additions", court: "additions", cycles: [2, 3] },
  { id: "soustractions", libelle: "Soustractions", court: "soustractions", cycles: [2, 3] },
  { id: "doubles", libelle: "Doubles", court: "doubles", cycles: [2, 3] },
  { id: "moities", libelle: "Moitiés", court: "moitiés", cycles: [2, 3] },
  { id: "dizaines", libelle: "Ajouter, retirer des dizaines, des centaines", court: "dizaines", cycles: [2, 3] },
  { id: "tables", libelle: "Tables de multiplication", court: "tables", cycles: [2, 3] },
  { id: "divisions", libelle: "Divisions : les tables à l'envers", court: "divisions", cycles: [3] },
  { id: "fois10", libelle: "Multiplier par 10, 100, 1 000", court: "× 10, 100", cycles: [2, 3] },
  { id: "decimaux", libelle: "Nombres décimaux : ajouter, retirer des dixièmes", court: "décimaux", cycles: [3] },
];

export const PLAFONDS_MARTINIERE = [10, 20, 50, 100, 1000, 10000] as const;
export const REFLEXIONS = [3, 5, 10, 15] as const;

export interface ReglagesMartiniere {
  cycle: 2 | 3;
  familles: FamilleCalcul[];
  /** Le plus grand nombre en jeu dans les sommes, différences et compléments. */
  jusqua: number;
  tables: number[];
  parSerie: number;
  series: number;
  /** Le temps de réflexion, en secondes, avant « écrivez ». */
  reflexion: number;
  /** Les ardoises papier, à la suite de la fiche du maître. */
  ardoises: boolean;
}

/** Ce que chaque cycle propose d'abord ; on y revient quand on change de cycle. */
export const REGLAGES_CYCLE: Record<2 | 3, Pick<ReglagesMartiniere, "familles" | "jusqua" | "tables">> = {
  2: { familles: ["complements", "additions", "soustractions", "doubles"], jusqua: 20, tables: [2, 5, 10] },
  3: { familles: ["tables", "divisions", "fois10", "complements", "additions"], jusqua: 1000, tables: [3, 4, 6, 7, 8, 9] },
};

export const REGLAGES_MARTINIERE: ReglagesMartiniere = { cycle: 2, ...REGLAGES_CYCLE[2], parSerie: 10, series: 2, reflexion: 5, ardoises: true };

export interface Calcul {
  famille: FamilleCalcul;
  /** Ce que le maître dit. */
  dire: string;
  /** Le calcul écrit, pour la correction au tableau. */
  ecrit: string;
  reponse: string;
}

/** Un nombre de dixièmes, écrit en décimal : 25 → « 2,5 », 40 → « 4 ». */
export const dixiemes = (n: number) => (n % 10 ? fr(n / 10, 1) : fr(n / 10));

/** Deux termes dont la somme ne dépasse pas `plafond` — et, au-delà de vingt, un second terme petit ou rond, comme on le calcule de tête. */
function deuxTermes(alea: () => number, plafond: number): [number, number] {
  const a = entier(alea, 1, plafond - 1);
  const reste = plafond - a;
  if (plafond <= 20 || reste < 10) return [a, entier(alea, 1, reste)];
  const tirage = alea();
  if (tirage < 0.4) return [a, entier(alea, 1, 9)];
  const pas = plafond >= 1000 && tirage < 0.7 ? 100 : 10;
  const rond = pas * entier(alea, 1, Math.floor(reste / pas));
  return rond > 0 ? [a, rond] : [a, entier(alea, 1, reste)];
}

/** Un calcul de la famille ; `null` quand la famille n'a pas de sens avec ces réglages. */
export function unCalcul(f: FamilleCalcul, r: ReglagesMartiniere, alea: () => number): Calcul | null {
  const J = Math.max(10, r.jusqua);
  switch (f) {
    case "complements": {
      const cible = J < 100 ? 10 : J < 1000 ? 100 : alea() < 0.5 ? 100 : 1000;
      let a: number;
      if (cible === 10) a = entier(alea, 1, 9);
      else if (cible === 100) a = r.cycle === 2 || alea() < 0.5 ? 10 * entier(alea, 1, 9) : entier(alea, 1, 99);
      else a = alea() < 0.5 ? 100 * entier(alea, 1, 9) : 10 * entier(alea, 1, 99);
      return { famille: f, dire: `Combien pour aller de ${fr(a)} à ${fr(cible)} ?`, ecrit: `${fr(a)} + … = ${fr(cible)}`, reponse: fr(cible - a) };
    }
    case "additions": {
      const [a, b] = deuxTermes(alea, J);
      return { famille: f, dire: `${fr(a)} plus ${fr(b)}`, ecrit: `${fr(a)} + ${fr(b)}`, reponse: fr(a + b) };
    }
    case "soustractions": {
      const [a, b] = deuxTermes(alea, J);
      return { famille: f, dire: `${fr(a + b)} moins ${fr(b)}`, ecrit: `${fr(a + b)} − ${fr(b)}`, reponse: fr(a) };
    }
    case "doubles": {
      const n = entier(alea, 1, Math.max(1, Math.floor(J / 2)));
      return { famille: f, dire: `Le double de ${fr(n)}`, ecrit: `${fr(n)} × 2`, reponse: fr(2 * n) };
    }
    case "moities": {
      const n = 2 * entier(alea, 1, Math.max(1, Math.floor(J / 2)));
      return { famille: f, dire: `La moitié de ${fr(n)}`, ecrit: `${fr(n)} ÷ 2`, reponse: fr(n / 2) };
    }
    case "dizaines": {
      if (J < 20) return null;
      const pas = J >= 1000 && alea() < 0.5 ? 100 : 10;
      const k = pas * entier(alea, 1, Math.min(9, Math.floor(J / pas) - 1));
      const a = entier(alea, 1, J - k);
      return alea() < 0.5
        ? { famille: f, dire: `${fr(a)} plus ${fr(k)}`, ecrit: `${fr(a)} + ${fr(k)}`, reponse: fr(a + k) }
        : { famille: f, dire: `${fr(a + k)} moins ${fr(k)}`, ecrit: `${fr(a + k)} − ${fr(k)}`, reponse: fr(a) };
    }
    case "tables": {
      if (!r.tables.length) return null;
      const t = choisir(alea, r.tables), k = entier(alea, 1, 10);
      return { famille: f, dire: `${fr(t)} fois ${fr(k)}`, ecrit: `${fr(t)} × ${fr(k)}`, reponse: fr(t * k) };
    }
    case "divisions": {
      if (!r.tables.length) return null;
      const t = choisir(alea, r.tables), k = entier(alea, 1, 10);
      return { famille: f, dire: `${fr(t * k)} divisé par ${fr(t)}`, ecrit: `${fr(t * k)} ÷ ${fr(t)}`, reponse: fr(k) };
    }
    case "fois10": {
      const facteur = choisir(alea, r.cycle === 3 ? [10, 100, 1000] : [10, 100]);
      const n = entier(alea, 2, r.cycle === 3 ? 99 : 30);
      return { famille: f, dire: `${fr(n)} fois ${fr(facteur)}`, ecrit: `${fr(n)} × ${fr(facteur)}`, reponse: fr(n * facteur) };
    }
    case "decimaux": {
      // En dixièmes, pour rester juste : 2,5 + 1,5 fait 4, pas 3,9999.
      const a = entier(alea, 1, 95), b = entier(alea, 1, 100 - a);
      return alea() < 0.5
        ? { famille: f, dire: `${dixiemes(a)} plus ${dixiemes(b)}`, ecrit: `${dixiemes(a)} + ${dixiemes(b)}`, reponse: dixiemes(a + b) }
        : { famille: f, dire: `${dixiemes(a + b)} moins ${dixiemes(b)}`, ecrit: `${dixiemes(a + b)} − ${dixiemes(b)}`, reponse: dixiemes(a) };
    }
  }
}

/** Les séries de la séance : chaque famille choisie revient à son tour, sans deux fois le même calcul. */
export function calculsMartiniere(r: ReglagesMartiniere, graine: number): Calcul[][] {
  const alea = hasard(graine);
  const vus = new Set<string>();
  const series: Calcul[][] = [];
  for (let s = 0; s < Math.max(1, r.series); s++) {
    const ordre = melanger(alea, r.familles);
    const serie: Calcul[] = [];
    if (!ordre.length) { series.push(serie); continue; }
    for (let i = 0; i < r.parSerie; i++) {
      let calcul: Calcul | null = null;
      // Une famille sans calcul possible (dizaines jusqu'à 10) cède la place à la suivante.
      for (let essai = 0; essai < 40 && !calcul; essai++) {
        const c = unCalcul(ordre[(i + Math.floor(essai / 20)) % ordre.length], r, alea);
        if (c && (!vus.has(c.ecrit) || essai >= 30)) calcul = c;
      }
      if (!calcul) continue;
      vus.add(calcul.ecrit);
      serie.push(calcul);
    }
    series.push(serie);
  }
  return series;
}

/** La ligne qui résume les réglages, sous le titre. */
export function resumeMartiniere(r: ReglagesMartiniere): string {
  const familles = FAMILLES_CALCUL.filter((f) => r.familles.includes(f.id)).map((f) => f.court).join(", ");
  const tables = r.familles.some((f) => f === "tables" || f === "divisions") && r.tables.length ? ` · tables de ${r.tables.join(", ")}` : "";
  return `Cycle ${r.cycle} · ${familles || "aucune famille"} · nombres jusqu'à ${fr(r.jusqua)}${tables} · ${r.series} série${r.series > 1 ? "s" : ""} de ${r.parSerie} calculs.`;
}

export function htmlMartiniere(series: Calcul[][], r: ReglagesMartiniere): string {
  const tete = `<div class="titre">Calcul mental — procédé La Martinière</div>
    <div class="regle"><b>Le procédé</b>Je dis le calcul, deux fois. On réfléchit sans écrire, ${r.reflexion} secondes. « Écrivez ! » : chacun écrit le résultat, et rien d'autre. « Montrez ! » : les ardoises se lèvent ensemble. On dit la réponse, on corrige, on passe au calcul suivant.
      <span style="color:#687087">— Le calcul mental à l'école, Éduscol : cinq à quinze minutes par jour, en rituel.</span></div>
    <div class="sous">${escapeHtml(resumeMartiniere(r))}</div>`;
  const tables = series.map((s, i) => `<table class="ma-serie"><caption>Série ${i + 1}</caption>
    <thead><tr><th>n°</th><th>Je dis</th><th>Au tableau</th><th>Réponse</th></tr></thead>
    <tbody>${s.map((c, j) => `<tr><td>${j + 1}</td><td>${escapeHtml(c.dire)}</td><td>${escapeHtml(c.ecrit)}</td><td><b>${escapeHtml(c.reponse)}</b></td></tr>`).join("")}</tbody></table>`).join("");
  const maitre = `<div class="page">${tete}<div class="ma-series">${tables}</div></div>`;
  if (!r.ardoises) return feuille(maitre, "ma");
  const ardoise = `<div class="ma-ardoise">
    <div class="ma-ardoise-tete"><span>Calcul mental</span><span>Prénom : ..............................</span><span>Date : ......................</span></div>
    ${series.map((s, i) => `<div class="ma-ardoise-serie"><div class="ma-ardoise-titre"><span>Série ${i + 1}</span><span class="ma-score">........ / ${s.length}</span></div>
      <div class="ma-cases">${s.map((_, j) => `<div class="ma-case"><span>${j + 1}</span></div>`).join("")}</div></div>`).join("")}
  </div>`;
  // Deux ardoises par page tant qu'elles y tiennent ; au-delà de quarante calculs, une seule.
  const total = series.reduce((n, s) => n + s.length, 0);
  const page = total > 40 ? `<div class="page">${ardoise}</div>` : `<div class="page">${ardoise}<div class="ma-coupe"></div>${ardoise}</div>`;
  return feuille(maitre + page, "ma");
}

export const STYLE_MARTINIERE = `
  .feuille.ma .ma-series { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5mm; align-items: start; }
  .feuille.ma .ma-serie { border-collapse: collapse; width: 100%; font-size: 12.5px; page-break-inside: avoid; }
  .feuille.ma .ma-serie caption { text-align: left; font-weight: 800; font-size: 13px; padding: 1mm 0; }
  .feuille.ma .ma-serie th, .feuille.ma .ma-serie td { border: 1px solid #9aa0b4; padding: 1.4mm 2mm; text-align: left; }
  .feuille.ma .ma-serie th { background: #f0f2f8; font-size: 10.5px; }
  .feuille.ma .ma-serie td:first-child { width: 6mm; text-align: center; color: #687087; }
  .feuille.ma .ma-serie td:last-child { text-align: center; width: 16mm; }
  .feuille.ma .ma-ardoise { padding: 2mm 0; page-break-inside: avoid; }
  .feuille.ma .ma-coupe { border-top: 1px dashed #9aa0b4; margin: 4mm 0; }
  .feuille.ma .ma-ardoise-tete { display: flex; gap: 8mm; font-size: 12px; font-weight: 700; margin-bottom: 2mm; }
  .feuille.ma .ma-ardoise-titre { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #687087; margin: 2.5mm 0 1mm; }
  .feuille.ma .ma-cases { display: flex; flex-wrap: wrap; gap: 1.5mm; }
  .feuille.ma .ma-case { width: 16mm; height: 12mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; position: relative; }
  .feuille.ma .ma-case span { position: absolute; top: .5mm; left: 1mm; font-size: 8px; color: #687087; }
`;
