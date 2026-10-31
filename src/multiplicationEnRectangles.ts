// Multiplier en rectangles : ce qui donne son sens à la multiplication posée.
//
// La technique s'appuie sur la distributivité, que deux représentations
// montrent : des objets rangés en rectangle, qu'on coupe après dix colonnes,
// et le quadrillage, qu'on coupe aux dizaines, d'un côté ou des deux. Et la
// table de Pythagore, affichée pour qui ne sait pas encore ses tables, ou à
// compléter.
//
// Les nombres se choisissent, ou se tirent au sort. La feuille de l'élève
// laisse chercher, sans imposer le découpage ; le corrigé coupe le rectangle
// et écrit les produits.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { choisir, entier, fr } from "./nombres";
import { escapeHtml } from "./print";

export type ExerciceRectangles = "objets" | "quadrillage" | "pythagore";

export const EXERCICES_RECTANGLES: { id: ExerciceRectangles; libelle: string }[] = [
  { id: "objets", libelle: "Des objets rangés en rectangle : combien en tout ?" },
  { id: "quadrillage", libelle: "Un quadrillage à dénombrer, coupé aux dizaines" },
  { id: "pythagore", libelle: "La table de Pythagore" },
];

export type ObjetsEnRectangle = "chaises" | "pommiers" | "tulipes";
export const OBJETS_EN_RECTANGLE: { id: ObjetsEnRectangle; libelle: string }[] = [
  { id: "chaises", libelle: "les chaises d'une salle" }, { id: "pommiers", libelle: "les pommiers d'un verger" },
  { id: "tulipes", libelle: "les tulipes d'un jardin" },
];

/** La table de Pythagore : remplie, pour l'afficher ; trouée ; ou vide, à remplir. */
export type TablePythagore = "remplie" | "trous" | "vide";

export interface ReglagesRectangles {
  exercice: ExerciceRectangles;
  /** Le nombre de rangées — ou de lignes du quadrillage — ; 0 : tiré au sort. */
  rangees: number;
  /** Ce qu'il y a dans chaque rangée — ou les colonnes du quadrillage — ; 0 : tiré au sort. */
  parRangee: number;
  /** Les objets du rectangle ; sans eux, le tirage en choisit. */
  objets?: ObjetsEnRectangle;
  /** Le quadrillage, au corrigé : coupé aux dizaines des lignes seulement, en deux morceaux, ou des deux côtés, en quatre. */
  morceaux?: 2 | 4;
  pythagore?: TablePythagore;
  titre?: string;
}

export const REGLAGES_RECTANGLES: ReglagesRectangles = { exercice: "objets", rangees: 0, parRangee: 0, morceaux: 2, pythagore: "remplie" };

const borneOuHasard = (v: unknown) => { const n = Math.round(Number(v)); return n >= 2 ? Math.min(60, n) : 0; };

/** Les réglages tels que l'atelier les relit : ce qui ne se lit pas reprend sa valeur par défaut ; 0 tire au sort. */
export function reglagesRectanglesSurs(brut: Partial<ReglagesRectangles> | null | undefined): ReglagesRectangles {
  const b = brut ?? {};
  return {
    ...b,
    exercice: EXERCICES_RECTANGLES.some((e) => e.id === b.exercice) ? b.exercice! : REGLAGES_RECTANGLES.exercice,
    rangees: borneOuHasard(b.rangees), parRangee: borneOuHasard(b.parRangee),
    objets: OBJETS_EN_RECTANGLE.some((o) => o.id === b.objets) ? b.objets : undefined,
    morceaux: b.morceaux === 4 ? 4 : 2,
    pythagore: b.pythagore === "trous" || b.pythagore === "vide" ? b.pythagore : "remplie",
  };
}

/** Le titre d'une feuille qu'on n'a pas nommée. */
export function titreRectangles(r: ReglagesRectangles): string {
  if (r.exercice === "pythagore") return "La table de Pythagore";
  if (r.exercice === "quadrillage") return "Combien de carreaux ?";
  return "Combien en tout ?";
}

// ── Les nombres et leur découpage ─────────────────────────────────────────

const NOIR = "#1c2233", ROUGE = "#d33a32", GRIS = "#b9c2d6";
const f2 = (x: number) => Number(x.toFixed(2));

/**
 * Les rangées et ce que contient chacune : ceux qu'on a choisis ; sinon, de 21 à 29 rangées de 11 à 19 objets, et un
 * quadrillage de 21 à 29 lignes de 21 à 39 carreaux.
 */
function nombres(r: ReglagesRectangles, alea: () => number): [number, number] {
  const rangees = r.rangees || entier(alea, 21, 29);
  let par = r.parRangee || (r.exercice === "quadrillage" ? entier(alea, 21, 39) : entier(alea, 11, 19));
  if (!r.parRangee && par % 10 === 0) par += 1;
  return [rangees, par];
}

/** Un nombre coupé à sa dizaine : 23 → [20, 3] ; 15 → [10, 5] ; 7 → [7]. Les morceaux nuls disparaissent. */
const couper = (n: number): number[] => [Math.floor(n / 10) * 10, n % 10].filter((x) => x > 0);

/** Les produits du découpage : chaque morceau de lignes par chaque morceau de colonnes, et la somme. */
function produits(lignes: number, colonnes: number, quatre: boolean): { calcul: string; morceaux: [number, number][] } {
  const ml = couper(lignes), mc = quatre ? couper(colonnes) : [colonnes];
  const morceaux: [number, number][] = ml.flatMap((l) => mc.map((c) => [c, l] as [number, number]));
  const ecrits = morceaux.map(([c, l]) => `${fr(c)} × ${fr(l)} = ${fr(c * l)}`);
  const somme = morceaux.length > 1 ? ` ; ${morceaux.map(([c, l]) => fr(c * l)).join(" + ")} = ${fr(lignes * colonnes)}` : "";
  return { calcul: `${fr(colonnes)} × ${fr(lignes)} = ${fr(colonnes * lignes)} : ${ecrits.join(" ; ")}${somme}`, morceaux };
}

// ── Le dessin ─────────────────────────────────────────────────────────────

/** Des objets en rectangle : `rangees` lignes de `par` objets ; au corrigé, la coupure après dix colonnes. */
function objetsSvg(rangees: number, par: number, objets: ObjetsEnRectangle, corrige: boolean): string {
  const s = Math.min(4.6, 130 / par, 120 / rangees), m = 2;
  const w = par * s + 2 * m, h = rangees * s + 2 * m;
  const couleur = { chaises: "#d9822b", pommiers: "#c0392b", tulipes: "#d63384" }[objets];
  const un = (x: number, y: number) => (objets === "chaises"
    ? `<rect x="${f2(x - s * 0.32)}" y="${f2(y - s * 0.32)}" width="${f2(s * 0.64)}" height="${f2(s * 0.64)}" rx="${f2(s * 0.12)}" fill="${couleur}" stroke="${NOIR}" stroke-width="0.15"/>`
    : `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(s * 0.36)}" fill="${couleur}" stroke="${NOIR}" stroke-width="0.15"/>`);
  let corps = "";
  for (let i = 0; i < rangees; i++) for (let j = 0; j < par; j++) corps += un(m + (j + 0.5) * s, m + (i + 0.5) * s);
  if (corrige && par > 10) {
    const x = m + 10 * s;
    corps += `<line x1="${f2(x)}" y1="${m - 1}" x2="${f2(x)}" y2="${f2(h - m + 1)}" stroke="${ROUGE}" stroke-width="0.6" stroke-dasharray="2 1.2"/>`;
  }
  return `<svg class="mr-dessin" viewBox="0 0 ${f2(w)} ${f2(h)}" width="${f2(w)}mm" height="${f2(h)}mm">${corps}</svg>`;
}

/** Un quadrillage de `colonnes` × `lignes` carreaux, à la plus grande taille qui tienne ; au corrigé, les coupures aux dizaines. */
function quadrillageSvg(colonnes: number, lignes: number, largeurMax: number, hauteurMax: number, corrige: boolean, quatre: boolean): string {
  const pas = Math.min(5, largeurMax / colonnes, hauteurMax / lignes), m = 1.5;
  const w = colonnes * pas + 2 * m, h = lignes * pas + 2 * m;
  let corps = "";
  for (let i = 0; i <= colonnes; i++) corps += `<line x1="${f2(m + i * pas)}" y1="${m}" x2="${f2(m + i * pas)}" y2="${f2(m + lignes * pas)}" stroke="${GRIS}" stroke-width="0.22"/>`;
  for (let j = 0; j <= lignes; j++) corps += `<line x1="${m}" y1="${f2(m + j * pas)}" x2="${f2(m + colonnes * pas)}" y2="${f2(m + j * pas)}" stroke="${GRIS}" stroke-width="0.22"/>`;
  corps += `<rect x="${m}" y="${m}" width="${f2(colonnes * pas)}" height="${f2(lignes * pas)}" fill="none" stroke="${NOIR}" stroke-width="0.4"/>`;
  if (corrige) {
    const coupe = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${ROUGE}" stroke-width="0.7"/>`;
    if (lignes > 10 && lignes % 10) corps += coupe(m, m + Math.floor(lignes / 10) * 10 * pas, m + colonnes * pas, m + Math.floor(lignes / 10) * 10 * pas);
    if (quatre && colonnes > 10 && colonnes % 10) corps += coupe(m + Math.floor(colonnes / 10) * 10 * pas, m, m + Math.floor(colonnes / 10) * 10 * pas, m + lignes * pas);
  }
  return `<svg class="mr-dessin" viewBox="0 0 ${f2(w)} ${f2(h)}" width="${f2(w)}mm" height="${f2(h)}mm">${corps}</svg>`;
}

// ── Les énoncés ───────────────────────────────────────────────────────────

const ENONCES: Record<ObjetsEnRectangle, { enonce: (r: number, p: number) => string; reponse: (n: string) => string }> = {
  chaises: { enonce: (r, p) => `Dans une salle de spectacle, il y a ${r} rangées de ${p} chaises. Combien de chaises y a-t-il dans la salle ?`, reponse: (n) => `Il y a ${n} chaises dans la salle.` },
  pommiers: { enonce: (r, p) => `Dans un verger, on a planté ${r} rangées de ${p} pommiers. Combien de pommiers y a-t-il dans le verger ?`, reponse: (n) => `Il y a ${n} pommiers dans le verger.` },
  tulipes: { enonce: (r, p) => `Une jardinière a planté ${r} rangées de ${p} tulipes. Combien de tulipes a-t-elle plantées ?`, reponse: (n) => `Elle a planté ${n} tulipes.` },
};

const CADRE = '<div class="mr-cadre"></div><div class="mr-reponse">Je réponds : <span class="mr-trait"></span></div>';

// ── La feuille ───────────────────────────────────────────────────────────

export function htmlRectangles(r: ReglagesRectangles, graine: number): string {
  const alea = hasard(graine);
  const titre = r.titre?.trim() || titreRectangles(r);
  let regle = "", corps = "", corrige = "";
  if (r.exercice === "pythagore") {
    const mode = r.pythagore ?? "remplie";
    const caches = new Set(mode === "vide" ? Array.from({ length: 100 }, (_, i) => i)
      : mode === "trous" ? melanger(alea, Array.from({ length: 100 }, (_, i) => i)).slice(0, 40) : []);
    const table = (montrer: boolean) => `<table class="mr-pythagore"><tr><th>×</th>${Array.from({ length: 10 }, (_, j) => `<th>${j + 1}</th>`).join("")}</tr>`
      + Array.from({ length: 10 }, (_, i) => `<tr><th>${i + 1}</th>${Array.from({ length: 10 }, (_, j) => {
        const k = i * 10 + j, cache = caches.has(k);
        return `<td${cache ? ' class="mr-vide"' : ""}>${!cache || montrer ? (cache && montrer ? `<b>${(i + 1) * (j + 1)}</b>` : (i + 1) * (j + 1)) : ""}</td>`;
      }).join("")}</tr>`).join("") + "</table>";
    regle = mode === "remplie" ? "" : "Je complète la table : dans chaque case, le produit du nombre de sa ligne par celui de sa colonne.";
    corps = table(false);
    corrige = mode === "remplie" ? "" : table(true);
  } else if (r.exercice === "quadrillage") {
    const [lignes, colonnes] = nombres(r, alea);
    const quatre = r.morceaux === 4;
    const { calcul } = produits(lignes, colonnes, quatre);
    regle = "Je trouve combien le quadrillage a de carreaux, sans les compter un à un. Je peux le couper le long des lignes, et calculer chaque morceau.";
    corps = `<p class="mr-enonce">Ce quadrillage a ${fr(colonnes)} carreaux de long et ${fr(lignes)} carreaux de large. Combien a-t-il de carreaux ?</p>${quadrillageSvg(colonnes, lignes, 180, 130, false, quatre)}${CADRE}`;
    corrige = `${quadrillageSvg(colonnes, lignes, 180, 130, true, quatre)}<p class="mr-solution">${escapeHtml(calcul)}</p>`;
  } else {
    const [rangees, par] = nombres(r, alea);
    const objets = r.objets ?? choisir(alea, OBJETS_EN_RECTANGLE).id;
    const e = ENONCES[objets];
    const n = fr(rangees * par);
    const decoupe = par > 10 && par % 10
      ? `${fr(rangees)} × ${fr(par)} = (${fr(rangees)} × 10) + (${fr(rangees)} × ${par % 10}) = ${fr(rangees * 10)} + ${fr(rangees * (par % 10))} = ${n}`
      : `${fr(rangees)} × ${fr(par)} = ${n}`;
    regle = "Je lis l'énoncé. Je cherche combien il y en a, sans les compter un à un, et j'écris comment j'ai fait. Je réponds par une phrase.";
    corps = `<p class="mr-enonce">${escapeHtml(e.enonce(rangees, par))}</p>${objetsSvg(rangees, par, objets, false)}${CADRE}`;
    corrige = `<p class="mr-enonce">${escapeHtml(e.enonce(rangees, par))}</p>${objetsSvg(rangees, par, objets, true)}`
      + `<p class="mr-solution"><b>Calcul :</b> ${escapeHtml(decoupe)} · <b>Réponse :</b> ${escapeHtml(e.reponse(n))}</p>`;
  }
  const page = `<div class="page"><div class="titre">${escapeHtml(titre)}</div>`
    + (r.exercice === "pythagore" && r.pythagore === "remplie" ? "" : '<div class="sous">Prénom : ........................................ Date : ........................</div>')
    + (regle ? `<div class="regle"><b>${r.exercice === "pythagore" ? "Complète" : "Cherche"}</b>${regle}</div>` : "") + corps + "</div>";
  return feuille(page + (corrige ? `<div class="page corrige"><div class="titre">${escapeHtml(titre)} — corrigé</div>${corrige}</div>` : ""), "mr");
}

export const STYLE_RECTANGLES = `
  .feuille.mr .mr-enonce { font-size: 15px; line-height: 1.55; margin: 0 0 3mm; }
  .feuille.mr .mr-dessin { display: block; margin: 0 0 3mm; }
  .feuille.mr .mr-cadre { height: 40mm; border: 1.2px dashed #9aa0b4; border-radius: 2mm; margin: 0 0 3mm; }
  .feuille.mr .mr-reponse { display: flex; gap: 2mm; align-items: flex-end; font-size: 14px; }
  .feuille.mr .mr-trait { flex: 1; border-bottom: 1px dotted #9aa0b4; height: 5mm; }
  .feuille.mr .mr-solution { font-size: 14px; line-height: 1.55; margin: 2mm 0 3mm; }
  .feuille.mr .mr-pythagore { width: auto; margin: 4mm auto; border-collapse: collapse; font-size: 17px; }
  .feuille.mr .mr-pythagore th, .feuille.mr .mr-pythagore td { width: 14mm; height: 13mm; padding: 0; border: 1px solid #9aa0b4; text-align: center; font-size: 18px; }
  .feuille.mr .mr-pythagore th { background: #f0f2f8; font-weight: 800; }
  .feuille.mr .mr-pythagore td.mr-vide { background: #fff; }
`;
