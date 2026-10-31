// Les grilles d'observables des séquences (demande de l'enseignant, 31 octobre
// 2026 : « dans évaluation sommative, il me faut des grilles d'observables pour
// évaluer les élèves […], surtout pour le cycle 1 ; quand ils commencent à
// savoir écrire, des évaluations sur feuille aussi ; l'utilisateur peut créer
// ses propres évaluations, mais aussi avoir accès aux grilles d'observables et
// aux évaluations des séquences »).
//
// Chaque séance dit ce que les élèves sauront à la fin : c'est un observable.
// La grille d'une séquence en fait ses lignes, les élèves ses colonnes. Chaque
// case prend un niveau — en maternelle, celui du carnet de suivi (ne réussit
// pas encore, en voie de réussite, réussit souvent), ensuite celui du LSU (non
// atteint, partiellement atteint, atteint, dépassé) — et, s'il le faut, l'aide
// qu'il a fallu : réussir avec un geste de l'adulte n'est pas échouer. Ce que
// l'enseignant coche se range dans le dossier de chaque élève.

import { NIVEAUX_MAITRISE, type Seance, type Sequence } from "./api";
import { DEBUT_OBJECTIF_SEANCE } from "./demarches";
import { escapeHtml } from "./print";

/** Une ligne de la grille : ce qu'on observe, et la séance d'où il vient. */
export interface Observable { id: string; numero: number; seance: string; texte: string }

/** Un niveau d'une échelle, du plus faible au plus fort. */
export interface Niveau { n: number; libelle: string; court: string; couleur: string }

/** Le carnet de suivi des apprentissages de l'école maternelle. */
export const ECHELLE_MATERNELLE: Niveau[] = [
  { n: 1, libelle: "Ne réussit pas encore", court: "Pas encore", couleur: "#d64d4d" },
  { n: 2, libelle: "En voie de réussite", court: "En voie", couleur: "#eb9e33" },
  { n: 3, libelle: "Réussit souvent", court: "Réussit", couleur: "#57b873" },
];

/** Le livret scolaire unique, du CP au CM2. */
export const ECHELLE_LSU: Niveau[] = NIVEAUX_MAITRISE.map((x) => ({ n: x.n, libelle: x.label, court: x.court, couleur: x.couleur }));

/** L'aide qu'il a fallu pour réussir, de la plus légère à la plus forte ; sans rien, l'élève a réussi seul. */
export const AIDES: { id: string; libelle: string; lettre: string }[] = [
  { id: "visuel", libelle: "avec un support visuel", lettre: "V" },
  { id: "geste", libelle: "avec un geste de l'adulte", lettre: "G" },
  { id: "main", libelle: "avec la main de l'adulte", lettre: "M" },
];

/** Ce que l'enseignant note dans une case : un niveau, et l'aide s'il en a fallu une. */
export interface Cellule { n?: number; aide?: string }

/** Ce que la grille d'une séquence garde pour un élève, observable par observable, dans son dossier. */
export type GrilleDeLEleve = Record<string, Cellule>;

/** La clé du document de l'élève qui garde sa grille pour cette séquence. */
export const cleDeLaGrille = (sequenceId: string) => `grille-sequence:${sequenceId}`;

const MATERNELLE = /^(TPS|PS|MS|GS)$/i;

/** L'échelle d'une séquence : celle de la maternelle pour le cycle 1, celle du LSU ensuite. */
export function echelleDe(s: Pick<Sequence, "cycle"> & { niveau?: string }): Niveau[] {
  const niveau = (s.niveau ?? "").trim();
  if (niveau) return MATERNELLE.test(niveau) ? ECHELLE_MATERNELLE : ECHELLE_LSU;
  return /cycle\s*1\b|maternelle/i.test(s.cycle ?? "") ? ECHELLE_MATERNELLE : ECHELLE_LSU;
}

/** Le niveau suivant, au clic : rien, puis du plus faible au plus fort, puis rien de nouveau. */
export function niveauSuivant(n: number | undefined, echelle: Niveau[]): number | undefined {
  if (n == null) return echelle[0].n;
  const i = echelle.findIndex((x) => x.n === n);
  return i < 0 || i === echelle.length - 1 ? undefined : echelle[i + 1].n;
}

/**
 * Ce qu'un objectif fait observer : sans « À la fin de cette séance, les
 * élèves sauront », la première lettre en capitale, sans point final. Un
 * objectif écrit en liste donne une ligne par élément.
 */
export function ceQuIlsSauront(objectifs: string): string[] {
  const debut = new RegExp(`^${DEBUT_OBJECTIF_SEANCE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:?\\s*`, "i");
  return (objectifs ?? "").split("\n")
    .map((l) => l.replace(/^\s*(?:[-–—•*]|\d+[.)])\s*/, "").trim().replace(debut, "").replace(/[.;]\s*$/, "").trim())
    .filter((l) => l.length > 2)
    .map((l) => l.charAt(0).toUpperCase() + l.slice(1));
}

/** Les observables d'une séquence : l'objectif de chacune de ses séances, dans leur ordre. */
export function observablesDeLaSequence(seances: Pick<Seance, "id" | "numero" | "titre" | "objectifs">[]): Observable[] {
  return [...seances].sort((a, b) => a.numero - b.numero).flatMap((s) => ceQuIlsSauront(s.objectifs)
    .map((texte, k, tous) => ({ id: tous.length > 1 ? `${s.id}:${k + 1}` : s.id, numero: s.numero, seance: s.titre, texte })));
}

// ── La grille imprimée ──

/** La page : en paysage, pour que chaque élève ait sa colonne. */
export const STYLE_GRILLE_OBSERVABLES = `
  @page { size: A4 landscape; margin: 10mm; }
  body { margin: 0; padding: 0; max-width: none; font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1c2233; }
  .go-titre { font-size: 17px; font-weight: 800; margin: 0 0 1mm; }
  .go-sous { font-size: 11px; color: #5a6072; margin: 0 0 3mm; }
  .go-legende { display: flex; flex-wrap: wrap; gap: 2mm 5mm; font-size: 10px; color: #4a5164; margin: 0 0 3mm; }
  .go-legende i { display: inline-block; width: 3mm; height: 3mm; border-radius: 50%; margin-right: 1mm; vertical-align: -0.4mm; }
  table.go { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.go th, table.go td { border: 0.3mm solid #9aa0b0; padding: 1.2mm; font-size: 10.5px; vertical-align: middle; }
  table.go thead th { background: #f2f3f7; font-weight: 700; }
  table.go th.go-eleve { height: 26mm; }
  table.go th.go-eleve span { display: inline-block; writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; max-height: 25mm; overflow: hidden; }
  table.go td.go-observable { line-height: 1.3; }
  table.go td.go-observable b { color: #5a6072; font-weight: 700; margin-right: 1mm; }
  table.go td.go-case { text-align: center; height: 9mm; }
  table.go td.go-case i { display: inline-block; width: 3.4mm; height: 3.4mm; border-radius: 50%; vertical-align: -0.6mm; }
  table.go td.go-case em { font-style: normal; font-weight: 800; font-size: 9px; margin-left: 0.8mm; color: #4a5164; }
  table.go tr { break-inside: avoid; page-break-inside: avoid; }
`;

/**
 * La grille d'une séquence, à imprimer : les observables en lignes, les élèves
 * en colonnes ; vierge pour noter à la main, ou remplie de ce qui est noté.
 */
export function htmlGrilleObservables(o: {
  titre: string; sous: string; observables: Observable[]; eleves: { id: string; nom: string }[];
  valeurs: Record<string, GrilleDeLEleve>; echelle: Niveau[]; vierge?: boolean;
}): string {
  const largeurObservable = o.eleves.length > 12 ? 34 : o.eleves.length > 6 ? 42 : 52;
  const legende = [...o.echelle.map((x) => `<span><i style="background:${x.couleur}"></i>${escapeHtml(x.libelle)}</span>`),
    ...AIDES.map((a) => `<span><b>${a.lettre}</b> ${escapeHtml(a.libelle)}</span>`)].join("");
  const cellule = (c: Cellule | undefined) => {
    if (o.vierge || !c) return "";
    const niveau = o.echelle.find((x) => x.n === c.n);
    const aide = AIDES.find((a) => a.id === c.aide);
    return `${niveau ? `<i style="background:${niveau.couleur}" title="${escapeHtml(niveau.libelle)}"></i>` : ""}${aide ? `<em>${aide.lettre}</em>` : ""}`;
  };
  const lignes = o.observables.map((ob) => `<tr><td class="go-observable"><b>S${ob.numero}</b>${escapeHtml(ob.texte)}</td>`
    + o.eleves.map((e) => `<td class="go-case">${cellule(o.valeurs[e.id]?.[ob.id])}</td>`).join("") + "</tr>").join("");
  return `<div class="go-titre">${escapeHtml(o.titre)}</div><div class="go-sous">${escapeHtml(o.sous)}</div>`
    + `<div class="go-legende">${legende}</div>`
    + `<table class="go"><colgroup><col style="width:${largeurObservable}%">${o.eleves.map(() => "<col>").join("")}</colgroup>`
    + `<thead><tr><th>Ce qu'on observe</th>${o.eleves.map((e) => `<th class="go-eleve"><span>${escapeHtml(e.nom)}</span></th>`).join("")}</tr></thead>`
    + `<tbody>${lignes}</tbody></table>`;
}
