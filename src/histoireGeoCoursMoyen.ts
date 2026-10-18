// L'histoire et la géographie au cours moyen : les feuilles des séquences.
//
// Programme d'histoire-géographie du cycle 3 (BO n° 22 du 28 mai 2026,
// annexe 4) : la frise chronologique « aide l'élève à visualiser le temps
// long » ; le planisphère et les cartes servent à localiser ; l'étude de
// documents, l'étude d'un sujet conduite par le professeur et le récit se
// complètent ; écrire en histoire et en géographie est « une activité
// quotidienne ». D'où, pour chaque thème (themesHistoireGeoCM.ts) : sa
// frise, à l'échelle, complétée pour l'affichage ou à compléter ; des
// documents et leurs questions ; des tris, des liens à tracer, des étapes à
// remettre dans l'ordre, des tableaux à remplir ; les mots du thème et leur
// définition ; une évaluation sur ses attendus.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { SOURCE_MAITRIZE, themeHGCM, type ExerciceHGCM, type FriseCM, type RepereCM, type ThemeHGCM } from "./themesHistoireGeoCM";

export interface ReglagesHistoireGeoCM {
  /** L'identifiant du thème : celui de sa séquence. */
  theme: string;
  /** « frise », « lexique », « evaluation », ou l'identifiant d'un exercice du thème. */
  exercice: string;
  /** La frise à compléter, avec ses étiquettes ; sinon complétée, pour l'affichage. */
  aCompleter?: boolean;
}

const esc = escapeHtml;
const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const titre = (t: string) => `<div class="titre">${esc(t)}</div>`;
const regle = (t: string) => `<div class="regle">${t}</div>`;
const rappel = (t: string) => `<div class="rappel">${esc(t)}</div>`;
const SOURCE = '<span class="reference">Programme d\'histoire-géographie du cycle 3, 2026.</span>';
const trait = '<div class="hg-trait"></div>';
const corrige = (t: string, corps: string) => `<div class="page corrige">${titre(`${t} — corrigé`)}${corps}</div>`;

// ── La frise ──────────────────────────────────────────────────────────────

/** La largeur d'une case de repère, en % de la frise ; sa hauteur, en mm. */
const LARGEUR = 17;
const HAUTEUR_CASE = 26;
/** Le haut de la bande des périodes, sa hauteur, celle de la bande des règnes, en mm. */
const HAUT_BANDE = 62, H1 = 12, H2 = 9;
/** La largeur de la frise, en mm : la page A4 couchée, moins ses marges et la flèche. */
const LARGEUR_FRISE_MM = 269;

interface Place { r: RepereCM; gauche: number; rangee: number }

/** Les cases des repères, de gauche à droite : au-dessus, au-dessous, puis plus haut, plus bas, sans qu'elles se chevauchent. */
function placer(f: FriseCM, x: (d: number) => number): Place[] {
  const fins = [-Infinity, -Infinity, -Infinity, -Infinity];
  return [...f.reperes].sort((a, b) => a.date - b.date).map((r) => {
    const voulu = Math.min(100 - LARGEUR, Math.max(0, x(r.date) - LARGEUR / 2));
    let rangee = fins.findIndex((fin) => fin + 1 <= voulu);
    if (rangee < 0) rangee = fins.indexOf(Math.min(...fins));
    const gauche = Math.min(100 - LARGEUR, Math.max(voulu, fins[rangee] + 1));
    fins[rangee] = gauche + LARGEUR;
    return { r, gauche, rangee };
  });
}

/** Les graduations : celles que la frise donne, sinon une tous les `pas` ans. */
function graduationsDe(f: FriseCM): { date: number; nom: string }[] {
  if (f.graduations) return f.graduations;
  const g: { date: number; nom: string }[] = [];
  for (let d = Math.ceil(f.debut / f.pas) * f.pas; d <= f.fin + 1e-9; d += f.pas) g.push({ date: d, nom: String(d) });
  return g;
}

/** La frise, à l'échelle : ses bandes, ses graduations, ses repères dans leurs cases ; à compléter, les cases et les bandes à placer restent vides. */
export function htmlFriseCM(f: FriseCM, aCompleter: boolean): string {
  const x = (d: number) => Math.min(100, Math.max(0, ((d - f.debut) / (f.fin - f.debut)) * 100));
  const rang2 = f.bandes.some((b) => b.rang === 2);
  const basBandes = HAUT_BANDE + H1 + (rang2 ? H2 : 0);
  const places = placer(f, x);
  // Sans case tout en haut, la frise remonte d'une rangée.
  const decalage = places.some((p) => p.rangee === 2) ? 0 : HAUTEUR_CASE + 6;
  const y = (v: number) => v - decalage;
  const hautDeRangee = [HAUTEUR_CASE + 6, basBandes + 10, 0, basBandes + 10 + HAUTEUR_CASE + 6];
  const bas = Math.max(basBandes + 9, ...places.map((p) => hautDeRangee[p.rangee] + HAUTEUR_CASE));

  const bandes = f.bandes.map((b) => {
    const g = x(b.debut), w = x(b.fin) - g;
    const deuxieme = b.rang === 2;
    // Le nom n'entre que si la bande est assez large : deux lignes au plus, et son plus long mot sur une ligne ; sinon en petit, sinon rien.
    const largeur = (w / 100) * LARGEUR_FRISE_MM - 2, plusLong = Math.max(...b.nom.split(/\s+/).map((m) => m.length));
    const tient = (parLettre: number) => b.nom.length * parLettre <= largeur * 2 && plusLong * parLettre <= largeur;
    const nom = aCompleter && b.aPlacer ? ""
      : tient(deuxieme ? 1.7 : 1.9) ? `<span>${esc(b.nom)}</span>`
        : tient(1.35) ? `<span class="hgf-petit">${esc(b.nom)}</span>` : "";
    return `<div class="hgf-bande${deuxieme ? " hgf-rang2" : ""}" style="left:${g.toFixed(2)}%;width:${w.toFixed(2)}%;top:${y(deuxieme ? HAUT_BANDE + H1 : HAUT_BANDE)}mm;height:${deuxieme ? H2 : H1}mm;background:${b.couleur}">${nom}</div>`;
  }).join("");
  const graduations = graduationsDe(f).map((g) => `<div class="hgf-grad" style="left:${x(g.date).toFixed(2)}%;top:${y(basBandes)}mm"><i></i><span>${esc(g.nom)}</span></div>`).join("");
  const reperes = places.map(({ r, gauche, rangee }) => {
    const haut = hautDeRangee[rangee];
    const dessus = rangee === 0 || rangee === 2;
    const xr = x(r.date).toFixed(2);
    const ligne = dessus
      ? `<div class="hgf-trait" style="left:${xr}%;top:${y(haut + HAUTEUR_CASE)}mm;height:${HAUT_BANDE - haut - HAUTEUR_CASE}mm"></div>`
      : `<div class="hgf-trait" style="left:${xr}%;top:${y(basBandes)}mm;height:${haut - basBandes}mm"></div>`;
    const point = `<div class="hgf-point" style="left:${xr}%;top:${y(dessus ? HAUT_BANDE : basBandes)}mm"></div>`;
    const contenu = aCompleter ? '<span class="hgf-vide"></span>' : `<span>${esc(r.quoi)}</span>`;
    return `${ligne}${point}<div class="hgf-case" style="left:${gauche.toFixed(2)}%;top:${y(haut)}mm"><b>${esc(r.quand)}</b>${contenu}</div>`;
  }).join("");
  const hauteurFleche = (H1 + (rang2 ? H2 : 0)) / 2 + 2;
  return `<div class="hgf" style="height:${y(bas) + 2}mm"><div class="hgf-zone">${bandes}${graduations}${reperes}</div>`
    + `<div class="hgf-fleche" style="top:${y(HAUT_BANDE) - 2}mm;border-top-width:${hauteurFleche}mm;border-bottom-width:${hauteurFleche}mm"></div></div>`;
}

function feuilleFrise(t: ThemeHGCM, aCompleter: boolean, graine: number): string {
  const f = t.frise!;
  if (!aCompleter) return `<div class="page">${titre(f.titre)}${htmlFriseCM(f, false)}</div>`;
  const aEcrire = f.bandes.filter((b) => b.aPlacer && b.nom).map((b) => b.nom);
  // Un jeu d'étiquettes par élève, autant que la page en tient (sept par rangée, douze rangées), huit au plus.
  const jeu = melanger(hasard(graine), f.reperes.map((r) => r.quoi));
  const etiquettes = Array.from({ length: Math.max(1, Math.min(8, Math.floor(84 / jeu.length))) }, () => jeu).flat();
  return `<div class="page">${titre(f.titre)}${TETE}`
    + regle(`Je lis chaque étiquette. Je la colle dans la case de sa date.${aEcrire.length ? " J'écris le nom de chaque période dans sa bande vide." : ""} ${SOURCE}`)
    + (aEcrire.length ? `<div class="hg-banque hgf-noms">${aEcrire.map((n) => `<span>${esc(n)}</span>`).join("")}</div>` : "")
    + `${htmlFriseCM(f, true)}</div>`
    + `<div class="page"><div class="titre">Les étiquettes à découper</div><div class="hgf-etiquettes">${etiquettes.map((e) => `<div class="hgf-etiquette">${esc(e)}</div>`).join("")}</div></div>`
    + `<div class="page corrige">${titre(`${f.titre} — corrigé`)}${htmlFriseCM(f, false)}</div>`;
}

// ── Les exercices ─────────────────────────────────────────────────────────

/** Deux colonnes à relier : un point au bout de chaque élément. */
function tableARelier(gauche: string[], droite: string[]): string {
  const point = '<td class="hg-pt"><i></i></td>';
  return `<table class="hg-relier">${gauche.map((g, i) => `<tr><td class="hg-g">${esc(g)}</td>${point}<td class="hg-espace"></td>${point}<td class="hg-d">${esc(droite[i])}</td></tr>`).join("")}</table>`;
}

function feuilleExercice(e: ExerciceHGCM, graine: number): string {
  const r = hasard(graine);
  const tete = `${titre(e.titre)}${TETE}${e.rappel ? rappel(e.rappel) : ""}`;
  switch (e.sorte) {
    case "document":
      return `<div class="page">${tete}${regle(`Je lis le document. Je réponds aux questions par des phrases. ${SOURCE}`)}`
        + `<div class="hg-document"><div class="hg-doc-titre">${esc(e.titre)}</div>${e.texte.map((p) => `<p>${esc(p)}</p>`).join("")}`
        + `<div class="hg-source">${esc(e.source ?? SOURCE_MAITRIZE)}</div></div>`
        + `${e.questions.map(([q], i) => `<div class="hg-q"><b>${i + 1}.</b> ${esc(q)}${trait}${trait}</div>`).join("")}</div>`
        + corrige(e.titre, `<ol class="hg-liste">${e.questions.map(([q, rep]) => `<li><b>${esc(q)}</b><br>${esc(rep)}</li>`).join("")}</ol>`);
    case "trier": {
      const items = melanger(r, e.items);
      const parColonne = e.colonnes.map((_, c) => e.items.filter(([, k]) => k === c));
      const hauteur = Math.max(...parColonne.map((l) => l.length)) * 10 + 8;
      const entetes = `<tr>${e.colonnes.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
      return `<div class="page">${tete}${regle(`${esc(e.consigne)} ${SOURCE}`)}`
        + `<div class="hg-banque">${items.map(([t]) => `<span>${esc(t)}</span>`).join("")}</div>`
        + `<table class="hg-tri">${entetes}<tr>${e.colonnes.map(() => `<td style="height:${hauteur}mm"></td>`).join("")}</tr></table></div>`
        + corrige(e.titre, `<table class="hg-tri">${entetes}<tr>${parColonne.map((l) => `<td>${l.map(([t]) => `<div>${esc(t)}</div>`).join("")}</td>`).join("")}</tr></table>`);
    }
    case "relier": {
      const droite = melanger(r, e.paires.map(([, d]) => d));
      return `<div class="page">${tete}${regle(`${esc(e.consigne)} ${SOURCE}`)}${tableARelier(e.paires.map(([g]) => g), droite)}</div>`
        + corrige(e.titre, `<ul class="hg-liste">${e.paires.map(([g, d]) => `<li><b>${esc(g)}</b> — ${esc(d)}</li>`).join("")}</ul>`);
    }
    case "ordonner": {
      const etapes = melanger(r, e.etapes);
      return `<div class="page">${tete}${regle(`${esc(e.consigne)} ${SOURCE}`)}`
        + `<table class="hg-ordre">${etapes.map((t) => `<tr><td class="hg-num"></td><td>${esc(t)}</td></tr>`).join("")}</table></div>`
        + corrige(e.titre, `<ol class="hg-liste">${e.etapes.map((t, i) => `<li>${e.dates?.[i] ? `<b>${esc(e.dates[i])}</b> — ` : ""}${esc(t)}</li>`).join("")}</ol>`);
    }
    case "tableau": {
      const tableau = (lignes: string[][]) => `<table class="hg-tableau"><tr>${e.entetes.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>`
        + `${lignes.map((l) => `<tr>${l.map((c, j) => (c ? `<td${j === 0 ? ' class="hg-tete"' : ""}>${esc(c)}</td>` : '<td class="hg-vide"></td>')).join("")}</tr>`).join("")}</table>`;
      return `<div class="page">${tete}${regle(`${esc(e.consigne)} ${SOURCE}`)}${tableau(e.lignes)}</div>`
        + (e.reponses ? corrige(e.titre, tableau(e.reponses)) : "");
    }
  }
}

// ── Les mots du thème, l'évaluation ───────────────────────────────────────

function feuilleLexique(t: ThemeHGCM): string {
  return `<div class="page">${titre(`Les mots du thème — ${t.titre}`)}<div class="hg-question">${esc(t.question)}</div>`
    + `<table class="hg-tableau hg-lexique"><tr><th>Le mot</th><th>Ce qu'il veut dire</th></tr>`
    + `${t.motsCles.map(([m, d]) => `<tr><td class="hg-tete">${esc(m)}</td><td>${esc(d)}</td></tr>`).join("")}</table></div>`;
}

function feuilleEvaluation(t: ThemeHGCM, graine: number): string {
  const r = hasard(graine);
  const parties: string[] = [];
  const reponses: string[] = [];
  let n = 0;
  const consigne = (texte: string) => `<div class="hg-consigne"><b>${++n}.</b> ${texte}</div>`;
  if (t.frise) {
    const reperes = melanger(r, t.frise.reperes).slice(0, 5);
    parties.push(`${consigne("J'écris la date de chaque évènement.")}<table class="hg-tableau hg-dates">${reperes.map((x) => `<tr><td>${esc(x.quoi)}</td><td class="hg-vide hg-date"></td></tr>`).join("")}</table>`);
    reponses.push(`<li>${reperes.map((x) => `${esc(x.quoi)} : <b>${esc(x.quand)}</b>`).join(" ; ")}</li>`);
  }
  const mots = melanger(r, t.motsCles).slice(0, 4);
  parties.push(`${consigne("Je relie chaque mot à sa définition.")}${tableARelier(mots.map(([m]) => m), melanger(r, mots.map(([, d]) => d)))}`);
  reponses.push(`<li>${mots.map(([m, d]) => `<b>${esc(m)}</b> : ${esc(d)}`).join(" ; ")}</li>`);
  for (const [q, rep] of t.evaluation) {
    parties.push(`${consigne(esc(q))}${trait}${trait}${trait}`);
    reponses.push(`<li>${esc(rep)}</li>`);
  }
  const nom = `Évaluation — ${t.titre}`;
  return `<div class="page">${titre(nom)}${TETE}${regle(`Je fais les exercices dans l'ordre. Je relis mes réponses. ${SOURCE}`)}${parties.join("")}</div>`
    + corrige(nom, `<ol class="hg-liste">${reponses.join("")}</ol>`);
}

// ── La feuille ────────────────────────────────────────────────────────────

/** Les feuilles d'un thème, telles que l'atelier les propose : la frise, les exercices, le lexique, l'évaluation. */
export function feuillesDuTheme(t: ThemeHGCM): { exercice: string; titre: string }[] {
  return [
    ...(t.frise ? [{ exercice: "frise", titre: t.frise.titre }] : []),
    ...t.exercices.map((e) => ({ exercice: e.id, titre: e.titre })),
    { exercice: "lexique", titre: "Les mots du thème" },
    { exercice: "evaluation", titre: "Évaluation" },
  ];
}

export function htmlHistoireGeoCM(r: ReglagesHistoireGeoCM, graine: number): string {
  const t = themeHGCM(r.theme);
  if (!t) return feuille(`<div class="page">${titre("Thème inconnu")}</div>`, "hg");
  const exercice = t.exercices.find((e) => e.id === r.exercice);
  const corps = r.exercice === "frise" && t.frise ? feuilleFrise(t, r.aCompleter !== false, graine)
    : r.exercice === "lexique" ? feuilleLexique(t)
      : exercice ? feuilleExercice(exercice, graine)
        : feuilleEvaluation(t, graine);
  return feuille(corps, "hg");
}

export const STYLE_HISTOIRE_GEO_CM = `
  .feuille.hg .hg-question { font-size: 13px; font-style: italic; color: #2c3346; margin: 0 0 3mm; }
  .feuille.hg .hg-document { border: 1.5px solid #1c2233; border-radius: 2mm; padding: 3mm 4mm; margin: 0 0 4mm; font-size: 13.5px; line-height: 1.6; }
  .feuille.hg .hg-document p { margin: 0 0 2mm; }
  .feuille.hg .hg-doc-titre { font-weight: 800; font-size: 14px; margin: 0 0 2mm; }
  .feuille.hg .hg-source { font-size: 10.5px; color: #687087; font-style: italic; text-align: right; }
  .feuille.hg .hg-q { font-size: 13.5px; margin: 0 0 3mm; line-height: 1.5; break-inside: avoid; page-break-inside: avoid; }
  .feuille.hg .hg-trait { border-bottom: 1px dotted #687087; height: 8mm; }
  .feuille.hg .hg-consigne { font-size: 13.5px; font-weight: 700; margin: 5mm 0 2mm; }
  .feuille.hg .hg-banque { display: flex; flex-wrap: wrap; gap: 2mm; margin: 0 0 4mm; }
  .feuille.hg .hg-banque span { border: 1px dashed #9aa0b4; border-radius: 1.5mm; padding: 1.5mm 2.5mm; font-size: 13px; }
  .feuille.hg table.hg-tri { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .feuille.hg table.hg-tri th { border: 1.5px solid #1c2233; background: #f7f8fc; padding: 2mm; font-size: 12.5px; }
  .feuille.hg table.hg-tri td { border: 1.5px solid #1c2233; vertical-align: top; padding: 2mm; font-size: 12.5px; }
  .feuille.hg table.hg-tri td div { margin: 0 0 1.5mm; }
  .feuille.hg table.hg-relier { width: 100%; border-collapse: collapse; font-size: 13px; margin: 0 0 3mm; }
  .feuille.hg table.hg-relier td { padding: 2.5mm 1mm; vertical-align: middle; border: none; }
  .feuille.hg .hg-g { width: 30%; font-weight: 700; text-align: right; }
  .feuille.hg .hg-espace { width: 14%; }
  .feuille.hg .hg-pt { width: 4%; text-align: center; }
  .feuille.hg .hg-pt i { display: inline-block; width: 2.6mm; height: 2.6mm; border-radius: 50%; background: #1c2233; }
  .feuille.hg .hg-d { width: 48%; }
  .feuille.hg table.hg-ordre { width: 100%; border-collapse: collapse; font-size: 13px; }
  .feuille.hg table.hg-ordre td { border: 1px solid #c4c9d6; padding: 2.5mm; }
  .feuille.hg table.hg-ordre td.hg-num { width: 12mm; border: 1.5px solid #1c2233; }
  .feuille.hg table.hg-tableau { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 0 0 3mm; }
  .feuille.hg table.hg-tableau th { border: 1.5px solid #1c2233; background: #f7f8fc; padding: 2mm; text-align: left; }
  .feuille.hg table.hg-tableau td { border: 1.5px solid #1c2233; padding: 2mm; height: 11mm; }
  .feuille.hg table.hg-lexique td { height: auto; }
  .feuille.hg .hg-tete { font-weight: 700; width: 30%; }
  .feuille.hg .hg-date { width: 40mm; }
  .feuille.hg .hg-liste { font-size: 13px; line-height: 1.55; padding-left: 6mm; }
  .feuille.hg .hg-liste li { margin: 0 0 2mm; }
  .feuille.hg .hgf { position: relative; margin: 4mm 0 0; }
  .feuille.hg .hgf-zone { position: absolute; left: 0; right: 8mm; top: 0; bottom: 0; }
  .feuille.hg .hgf-bande { position: absolute; box-sizing: border-box; border: 1px solid #1c2233; display: flex; align-items: center; justify-content: center;
    text-align: center; overflow: hidden; font-weight: 800; font-size: 11px; line-height: 1.15; padding: 0 1mm; }
  .feuille.hg .hgf-bande.hgf-rang2 { font-weight: 700; font-size: 9.5px; }
  .feuille.hg .hgf-bande .hgf-petit { font-size: 7.5px; font-weight: 700; }
  .feuille.hg .hgf-fleche { position: absolute; right: 0; width: 0; height: 0; border-left: 8mm solid #1c2233; border-top-style: solid; border-bottom-style: solid;
    border-top-color: transparent; border-bottom-color: transparent; }
  .feuille.hg .hgf-grad { position: absolute; width: 0; z-index: 2; }
  .feuille.hg .hgf-grad i { display: block; height: 2mm; border-left: 1.2px solid #1c2233; }
  .feuille.hg .hgf-grad span { position: absolute; top: 2.2mm; left: 0; transform: translateX(-50%); font-size: 10.5px; font-weight: 700; white-space: nowrap;
    background: #fff; padding: 0 0.6mm; }
  .feuille.hg .hgf-trait { position: absolute; width: 0; border-left: 1.2px solid #1c2233; }
  .feuille.hg .hgf-point { position: absolute; width: 3mm; height: 3mm; margin: -1.5mm 0 0 -1.5mm; border-radius: 50%; background: #1c2233; }
  .feuille.hg .hgf-case { position: absolute; width: ${LARGEUR}%; height: ${HAUTEUR_CASE}mm; box-sizing: border-box; border: 1.5px solid #1c2233; border-radius: 2mm;
    background: #fff; padding: 1.5mm 2mm; font-size: 10.5px; line-height: 1.3; overflow: hidden; z-index: 1; }
  .feuille.hg .hgf-case b { display: block; font-size: 11.5px; margin: 0 0 1mm; }
  .feuille.hg .hgf-vide { display: block; height: 14.5mm; border: 1px dashed #9aa0b4; border-radius: 1.5mm; }
  .feuille.hg .hgf-etiquettes { display: flex; flex-wrap: wrap; gap: 0; }
  .feuille.hg .hgf-etiquette { width: 38mm; height: 14.5mm; box-sizing: border-box; border: 1px dashed #9aa0b4; display: flex; align-items: center;
    justify-content: center; text-align: center; font-size: 10px; font-weight: 700; line-height: 1.2; padding: 1mm 1.5mm; }
`;

/** Le style d'une feuille : la frise se met en paysage. */
export const styleHistoireGeoCM = (r: Pick<ReglagesHistoireGeoCM, "exercice">) =>
  STYLE_HISTOIRE_GEO_CM + (r.exercice === "frise" ? "\n  @page { size: A4 landscape; margin: 10mm; }\n" : "");
