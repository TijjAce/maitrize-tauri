// Le calcul mental : un fait numérique, une procédure à la fois.
//
// Les programmes rangent le calcul mental en objectifs précis, classe par
// classe (voir `faitsNumeriques`). On en choisit un, et la feuille ne
// travaille que lui : c'est ainsi qu'un fait se mémorise. La révision, qui
// en mêle plusieurs, se demande à part.
//
// Deux formes. À l'oral, c'est le procédé La Martinière : le maître dit le
// calcul, deux fois ; les élèves réfléchissent sans écrire ; « écrivez » —
// chacun écrit le résultat sur l'ardoise ; « montrez » — les ardoises se
// lèvent ensemble ; on corrige, on passe au suivant. La feuille est alors la
// fiche du maître, et les ardoises papier pour qui n'a pas d'ardoise. Par
// écrit, c'est le test de fluence que les programmes demandent : des
// égalités à trou à compléter en temps limité, pour voir ses progrès.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { NIVEAUX, objectifParId, objectifsDuNiveau, tirerCalcul, type Calcul, type Niveau, type Objectif } from "./faitsNumeriques";

export const REFLEXIONS = [3, 5, 10, 15] as const;
export type FormeEntrainement = "oral" | "ecrit";

export interface ReglagesMartiniere {
  niveau: Niveau;
  /** Ce qu'on travaille : un seul objectif, sauf en révision. */
  objectifs: string[];
  /** La révision : plusieurs objectifs mêlés dans les mêmes séries. */
  revision: boolean;
  /** Les tables, pour les objectifs « au choix ». */
  tables: number[];
  /** À l'oral, le procédé La Martinière ; par écrit, un test de fluence. */
  forme: FormeEntrainement;
  parSerie: number;
  series: number;
  /** Le temps de réflexion, en secondes, avant « écrivez ». */
  reflexion: number;
  /** Les ardoises papier, à la suite de la fiche du maître. */
  ardoises: boolean;
}

export const REGLAGES_MARTINIERE: ReglagesMartiniere = {
  niveau: "CP", objectifs: ["cp-complements-10"], revision: false, tables: [2], forme: "oral",
  parSerie: 10, series: 2, reflexion: 5, ardoises: true,
};

/** Ce qu'on travaille vraiment : les objectifs choisis qui sont de la classe — le premier de la classe à défaut —, un seul hors révision. */
export function objectifsRetenus(r: Pick<ReglagesMartiniere, "niveau" | "objectifs" | "revision">): Objectif[] {
  const choisis = (r.objectifs ?? []).map(objectifParId).filter((o): o is Objectif => !!o && o.niveau === r.niveau);
  const retenus = choisis.length ? choisis : objectifsDuNiveau(r.niveau).slice(0, 1);
  return r.revision ? retenus : retenus.slice(0, 1);
}

/** L'objectif tel qu'on le travaille : avec la table choisie, quand il en demande une. */
export function libelleTravaille(o: Objectif, tables: number[]): string {
  if (!o.tables) return o.libelle;
  const choisies = tables.filter((t) => o.tables!.includes(t));
  const liste = (choisies.length ? choisies : [o.tables[0]]).join(", ");
  return `${o.libelle.replace(", au choix", "")} : ${liste}`;
}

/** Ce que le programme attend en fin d'année pour cet objectif, quand il le chiffre. */
export function fluenceAttendue(o: Objectif): string {
  if (o.fluence) return o.fluence;
  return o.rubrique === "faits" ? "" : NIVEAUX.find((n) => n.id === o.niveau)?.procedures ?? "";
}

/** Les séries : chaque objectif retenu revient à son tour, sans deux fois le même calcul tant que c'est possible. */
export function calculsMartiniere(r: ReglagesMartiniere, graine: number): Calcul[][] {
  const alea = hasard(graine);
  const retenus = objectifsRetenus(r);
  const vus = new Set<string>();
  const series: Calcul[][] = [];
  for (let s = 0; s < Math.max(1, Math.min(6, r.series)); s++) {
    const ordre = melanger(alea, retenus);
    const serie: Calcul[] = [];
    for (let i = 0; i < Math.max(1, Math.min(30, r.parSerie)); i++) {
      const objectif = ordre[i % ordre.length];
      let calcul = tirerCalcul(objectif, alea, r.tables ?? []);
      // Une table n'a que dix produits : au-delà, il faut bien y revenir.
      for (let essai = 0; essai < 30 && vus.has(calcul.ecrit); essai++) calcul = tirerCalcul(objectif, alea, r.tables ?? []);
      vus.add(calcul.ecrit);
      serie.push(calcul);
    }
    series.push(serie);
  }
  return series;
}

/** La ligne qui dit ce que la feuille travaille. */
export function resumeMartiniere(r: ReglagesMartiniere): string {
  const retenus = objectifsRetenus(r);
  const quoi = retenus.map((o) => libelleTravaille(o, r.tables ?? [])).join(" ; ");
  return `${r.niveau} · ${quoi} · ${r.series} série${r.series > 1 ? "s" : ""} de ${r.parSerie} calculs.`;
}

const avecTrou = (ecrit: string) => escapeHtml(ecrit).replace("…", `<span class="ma-trou"></span>`);
const avecReponse = (c: Calcul) => escapeHtml(c.ecrit).replace("…", `<b>${escapeHtml(c.reponse)}</b>`);

function htmlOral(series: Calcul[][], r: ReglagesMartiniere): string {
  const attendu = objectifsRetenus(r).map(fluenceAttendue).find(Boolean);
  const tete = `<div class="titre">Calcul mental — procédé La Martinière</div>
    <div class="regle"><b>Le procédé</b>Je dis le calcul, deux fois. On réfléchit sans écrire, ${r.reflexion} secondes. « Écrivez ! » : chacun écrit le résultat, et rien d'autre. « Montrez ! » : les ardoises se lèvent ensemble. On dit la réponse, on corrige, on passe au calcul suivant.</div>
    <div class="sous">${escapeHtml(resumeMartiniere(r))}${attendu ? ` Attendu en fin de ${r.niveau} : ${escapeHtml(attendu)}.` : ""}</div>`;
  const tables = series.map((s, i) => `<table class="ma-serie"><caption>Série ${i + 1}</caption>
    <thead><tr><th>n°</th><th>Je dis</th><th>Au tableau</th><th class="corrige">Réponse</th></tr></thead>
    <tbody>${s.map((c, j) => `<tr><td>${j + 1}</td><td>${escapeHtml(c.dire)}</td><td>${escapeHtml(c.ecrit)}</td><td class="corrige"><b>${escapeHtml(c.reponse)}</b></td></tr>`).join("")}</tbody></table>`).join("");
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

function htmlEcrit(series: Calcul[][], r: ReglagesMartiniere): string {
  const faits = objectifsRetenus(r).every((o) => o.rubrique === "faits");
  const consigne = faits ? "Complète le plus d'égalités possible en une minute." : "Calcule de tête, et complète les égalités.";
  const bloc = (s: Calcul[], i: number, corrige: boolean) => `<div class="ma-test"><div class="ma-test-titre"><span>Série ${i + 1}</span>`
    + (corrige ? "" : `<span class="ma-score">Temps : ............ Score : ........ / ${s.length}</span>`) + `</div>
    <div class="ma-egalites">${s.map((c, j) => `<div class="ma-egalite"><span class="ma-numero">${j + 1}</span>${corrige ? avecReponse(c) : avecTrou(c.ecrit)}</div>`).join("")}</div></div>`;
  const eleve = `<div class="page"><div class="titre">Calcul mental</div><div class="sous">Prénom : ........................................ Date : ........................</div>
    <div class="consigne">${consigne}</div>${series.map((s, i) => bloc(s, i, false)).join("")}</div>`;
  const corrige = `<div class="page corrige"><div class="titre">Calcul mental — corrigé</div><div class="sous">${escapeHtml(resumeMartiniere(r))}</div>${series.map((s, i) => bloc(s, i, true)).join("")}</div>`;
  return feuille(eleve + corrige, "ma");
}

export const htmlMartiniere = (series: Calcul[][], r: ReglagesMartiniere): string => (r.forme === "ecrit" ? htmlEcrit(series, r) : htmlOral(series, r));

export const STYLE_MARTINIERE = `
  .feuille.ma .consigne { font-size: 15px; font-weight: 700; color: #1c2233; margin: 0 0 4mm; }
  .feuille.ma .ma-series { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5mm; align-items: start; }
  .feuille.ma .ma-serie { border-collapse: collapse; width: 100%; font-size: 12.5px; page-break-inside: avoid; }
  .feuille.ma .ma-serie caption { text-align: left; font-weight: 800; font-size: 13px; padding: 1mm 0; }
  .feuille.ma .ma-serie th, .feuille.ma .ma-serie td { border: 1px solid #9aa0b4; padding: 1.4mm 2mm; text-align: left; }
  .feuille.ma .ma-serie th { background: #f0f2f8; font-size: 10.5px; }
  .feuille.ma .ma-serie td:first-child { width: 6mm; text-align: center; color: #687087; }
  .feuille.ma .ma-serie td.corrige { text-align: center; width: 16mm; }
  .feuille.ma .ma-serie td:nth-child(3) { white-space: nowrap; }
  .feuille.ma .ma-ardoise { padding: 2mm 0; page-break-inside: avoid; }
  .feuille.ma .ma-coupe { border-top: 1px dashed #9aa0b4; margin: 4mm 0; }
  .feuille.ma .ma-ardoise-tete { display: flex; gap: 8mm; font-size: 12px; font-weight: 700; margin-bottom: 2mm; }
  .feuille.ma .ma-ardoise-titre, .feuille.ma .ma-test-titre { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #687087; margin: 2.5mm 0 1mm; }
  .feuille.ma .ma-cases { display: flex; flex-wrap: wrap; gap: 1.5mm; }
  .feuille.ma .ma-case { width: 16mm; height: 12mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; position: relative; }
  .feuille.ma .ma-case span { position: absolute; top: .5mm; left: 1mm; font-size: 8px; color: #687087; }
  .feuille.ma .ma-test { margin: 0 0 5mm; page-break-inside: avoid; }
  .feuille.ma .ma-egalites { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 8mm; }
  .feuille.ma .ma-egalite { display: flex; align-items: center; gap: 2mm; font-size: 18px; font-weight: 600; padding: 2.2mm 0; border-bottom: 1px dotted #c4c9d6; }
  .feuille.ma .ma-numero { font-size: 10px; font-weight: 400; color: #687087; width: 6mm; }
  .feuille.ma .ma-trou { display: inline-block; width: 14mm; height: 8mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; vertical-align: middle; margin: 0 1mm; }
`;
