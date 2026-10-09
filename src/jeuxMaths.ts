// Les jeux et le matériel de mathématiques que les livrets font fabriquer.
//
// Livret Mathématiques CP (2025) : passer d'une représentation du nombre à
// une autre — collection, écriture chiffrée, mot, décomposition —, et l'arbre
// à calcul pour ajouter deux nombres. Livrets CE1 et CE2 (2025) : des jeux
// de cartes pour mémoriser les tables, des cartes recto-verso pour se tester,
// le mémory et la bataille des fractions, la bande unité qu'on plie, la règle
// graduée en quarts puis en dixièmes, la course des nageurs. Livret
// « Résolution de problèmes » (2025) : la piste du type jeu de l'oie, avec
// des dés, pour les problèmes de déplacement.

import { escapeHtml } from "./print";
import { hasard, melanger } from "./hasard";
import { carte, feuille, pagesDeCartes, pagesRectoVerso } from "./cartesImprimables";
import { fractionEnLettres, nombreEnLettres } from "./nombresEnLettres";

// ── Les cartes des nombres ────────────────────────────────────────────────

export type Representation = "chiffre" | "constellation" | "boite" | "mot" | "decomposition";
export const REPRESENTATIONS: { id: Representation; libelle: string }[] = [
  { id: "chiffre", libelle: "l'écriture en chiffres" },
  { id: "constellation", libelle: "la constellation (dé)" },
  { id: "boite", libelle: "la boîte de dix" },
  { id: "mot", libelle: "le mot" },
  { id: "decomposition", libelle: "la décomposition (10 + 4)" },
];

export interface ReglagesNombres { de: number; a: number; representations: Representation[] }
export const REGLAGES_NOMBRES: ReglagesNombres = { de: 1, a: 10, representations: ["chiffre", "constellation", "boite", "mot"] };

/** Les points d'un dé, aux places habituelles ; au-delà de six, deux dés. */
export function constellationSvg(n: number): string {
  const places: Record<number, [number, number][]> = {
    1: [[50, 50]], 2: [[25, 25], [75, 75]], 3: [[25, 25], [50, 50], [75, 75]], 4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]], 6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
  };
  const de = (k: number, dx: number) => `<rect x="${dx + 3}" y="3" width="94" height="94" rx="14" fill="#fff" stroke="#1c2233" stroke-width="3"/>${
    (places[k] ?? []).map(([x, y]) => `<circle cx="${dx + x}" cy="${y}" r="9" fill="#1c2233"/>`).join("")}`;
  if (n <= 6) return `<svg viewBox="0 0 100 100" width="22mm" height="22mm">${de(n, 0)}</svg>`;
  const premier = Math.min(6, n - 1);
  return `<svg viewBox="0 0 210 100" width="40mm" height="19mm">${de(premier, 0)}${de(n - premier, 110)}</svg>`;
}

/** Une boîte de dix par dizaine : cinq cases par rangée, les pleines en noir. */
export function boiteDeDixSvg(n: number): string {
  const boites = Math.max(1, Math.ceil(n / 10));
  const largeur = 110, hauteur = boites * 50;
  let corps = "";
  for (let b = 0; b < boites; b++) {
    for (let i = 0; i < 10; i++) {
      const plein = b * 10 + i < n;
      const x = 3 + (i % 5) * 21, y = 3 + b * 50 + Math.floor(i / 5) * 21;
      corps += `<rect x="${x}" y="${y}" width="20" height="20" fill="${plein ? "#1c2233" : "#fff"}" stroke="#1c2233" stroke-width="1.5"/>`;
    }
  }
  return `<svg viewBox="0 0 ${largeur} ${hauteur}" width="${boites > 1 ? 30 : 30}mm" height="${boites * 13.5}mm">${corps}</svg>`;
}

export const decomposition = (n: number) =>
  n >= 10 ? (n % 10 ? `${Math.floor(n / 10) * 10} + ${n % 10}` : `${n}`) : n > 5 ? `5 + ${n - 5}` : `${n}`;

export interface CarteNombre { nombre: number; representation: Representation; html: string }

export function cartesNombres(r: ReglagesNombres): CarteNombre[] {
  const sortie: CarteNombre[] = [];
  for (let n = Math.max(0, r.de); n <= Math.min(99, r.a); n++) {
    for (const rep of r.representations) {
      if (rep === "constellation" && (n > 12 || n < 1)) continue;
      if (rep === "boite" && (n > 20 || n < 1)) continue;
      const html = rep === "chiffre" ? `<div class="nb-chiffre">${n}</div>`
        : rep === "constellation" ? constellationSvg(n)
        : rep === "boite" ? boiteDeDixSvg(n)
        : rep === "mot" ? `<div class="nb-mot">${escapeHtml(nombreEnLettres(n))}</div>`
        : `<div class="nb-deco">${decomposition(n)}</div>`;
      sortie.push({ nombre: n, representation: rep, html });
    }
  }
  return sortie;
}

export function htmlCartesNombres(cartes: CarteNombre[], r: ReglagesNombres): string {
  const regle = `<div class="titre">Cartes des nombres de ${r.de} à ${r.a}</div>
    <div class="regle"><b>Jeu de mémoire</b>Cartes face cachée ; on en retourne deux : le même nombre sous deux formes différentes fait une paire.
      <b style="margin-top:4px">Bataille</b>Chacun retourne une carte, quelle que soit sa forme ; le plus grand nombre remporte le pli.
      <b style="margin-top:4px">Loto</b>Les nombres écrits en chiffres sur les planches, les autres écritures à piocher.
      <span class="reference">Livret Mathématiques CP, Éduscol 2025 : passer d'une représentation à une autre.</span></div>`;
  return feuille(pagesDeCartes(cartes.map((c) => carte(c.html)), { colonnes: 4, lignes: 5 }, regle), "nb");
}

// ── Les cartes de calcul ──────────────────────────────────────────────────

export type Operation = "x" | "+" | "-";
export interface ReglagesCalcul { operation: Operation; tables: number[]; rectoVerso: boolean; melanger: boolean }
export const REGLAGES_CALCUL: ReglagesCalcul = { operation: "x", tables: [2, 5], rectoVerso: true, melanger: true };

export interface CarteCalcul { question: string; reponse: number }

export function cartesCalcul(r: ReglagesCalcul, graine: number): CarteCalcul[] {
  const sortie: CarteCalcul[] = [];
  for (const t of r.tables) {
    for (let k = 1; k <= 10; k++) {
      if (r.operation === "x") sortie.push({ question: `${t} × ${k}`, reponse: t * k });
      else if (r.operation === "+") sortie.push({ question: `${t} + ${k}`, reponse: t + k });
      else sortie.push({ question: `${t + k} − ${k}`, reponse: t });
    }
  }
  return r.melanger ? melanger(hasard(graine), sortie) : sortie;
}

/** Les cartes, recto-verso ou avec leur corrigé ; `titre` remplace celui que disent les tables — des cartes « + 19 », par exemple. */
export function htmlCartesCalcul(cartes: CarteCalcul[], r: ReglagesCalcul, titre?: string): string {
  // Ce que disent les nombres choisis : la table de multiplication, le premier terme de l'addition, la différence de la soustraction.
  const nom = r.operation === "x" ? "tables de multiplication de" : r.operation === "+" ? "tables d'addition de" : "soustractions dont la différence est";
  const regle = `<div class="titre">${titre ? escapeHtml(titre) : `Cartes de calcul — ${nom} ${r.tables.join(", ")}`}</div>
    <div class="regle"><b>Se tester</b>On lit la carte, on dit le résultat, on retourne pour vérifier — en classe et à la maison.
      <b style="margin-top:4px">Bataille</b>Chacun retourne une carte et calcule ; le plus grand résultat remporte le pli. À égalité, bataille !
      <span class="reference">Livrets Mathématiques CE1 et CE2, Éduscol 2025 : jeux de cartes et cartes recto-verso pour mémoriser.</span></div>`;
  const rectos = cartes.map((c) => carte(`<div class="ca-question">${escapeHtml(c.question)}</div>`));
  if (r.rectoVerso) {
    const versos = cartes.map((c) => carte(`<div class="ca-reponse">${c.reponse}</div>`));
    return feuille(pagesRectoVerso(rectos, versos, { colonnes: 4, lignes: 5 }, regle), "ca");
  }
  const corrige = `<div class="page corrige"><div class="titre">Corrigé</div><div class="ca-corrige">${cartes.map((c) => `<span>${escapeHtml(c.question)} = <b>${c.reponse}</b></span>`).join("")}</div></div>`;
  return feuille(`${pagesDeCartes(rectos, { colonnes: 4, lignes: 5 }, regle)}${corrige}`, "ca");
}

// ── L'arbre à calcul ──────────────────────────────────────────────────────

export interface ReglagesArbre { combien: number; retenue: "sans" | "avec" | "mixte"; aide: boolean }
export const REGLAGES_ARBRE: ReglagesArbre = { combien: 6, retenue: "sans", aide: false };

export interface Addition { a: number; b: number }

export function additionsArbre(r: ReglagesArbre, graine: number): Addition[] {
  const alea = hasard(graine);
  const sortie: Addition[] = [];
  const vues = new Set<string>();
  let garde = 0;
  while (sortie.length < r.combien && garde++ < 2000) {
    const a = 10 + Math.floor(alea() * 80);
    const b = 10 + Math.floor(alea() * 80);
    if (a + b >= 100) continue;
    const retenue = (a % 10) + (b % 10) >= 10;
    if (r.retenue === "sans" && retenue) continue;
    if (r.retenue === "avec" && !retenue) continue;
    const cle = `${a}+${b}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    sortie.push({ a, b });
  }
  return sortie;
}

/** La feuille des arbres ; `entete` remplace son titre et sa règle — pour l'évaluation d'une séquence, par exemple. */
export function htmlArbreCalcul(liste: Addition[], r: ReglagesArbre, entete?: { titre: string; consigne: string }): string {
  const boite = (v: string | number, classe = "") => `<span class="ar-boite ${classe}">${v}</span>`;
  const arbre = ({ a, b }: Addition) => {
    const da = Math.floor(a / 10) * 10, ua = a % 10, db = Math.floor(b / 10) * 10, ub = b % 10;
    const d = r.aide ? [da, ua, db, ub] : ["", "", "", ""];
    return `<div class="ar-arbre">
      <div class="ar-ligne"><b>${a} + ${b} = </b>${boite("", "ar-total")}</div>
      <div class="ar-ligne ar-branches">${boite(d[0])} ${boite(d[1])} <span class="ar-plus">+</span> ${boite(d[2])} ${boite(d[3])}</div>
      <div class="ar-ligne">${boite("")} + ${boite("")} = ${boite("", "ar-dizaines")} <span class="ar-sep"></span> ${boite("")} + ${boite("")} = ${boite("", "ar-unites")}</div>
      <div class="ar-ligne">${boite("")} + ${boite("")} = ${boite("", "ar-total")}</div>
    </div>`;
  };
  const regle = entete
    ? `<div class="titre">${escapeHtml(entete.titre)}</div><div class="regle">${escapeHtml(entete.consigne)}</div>
      <div class="sous">Prénom : ........................................ Date : ........................ Score : ........ / ${liste.length}</div>`
    : `<div class="titre">Arbre à calcul — ajouter deux nombres</div>
    <div class="regle"><b>Comment faire</b>Je décompose chaque nombre en dizaines et unités, j'ajoute les dizaines entre elles, les unités entre elles, puis je recompose la somme.
      L'arbre soutient le raisonnement ; l'objectif est de finir par s'en passer.
      <span class="reference">Livret Mathématiques CP, Éduscol 2025.</span></div><div class="sous">Prénom : ........................................ Date : ........................</div>`;
  return feuille(`<div class="page">${regle}<div class="ar-grille">${liste.map(arbre).join("")}</div></div>`, "ar");
}

// ── Les fractions : cartes, bandes, règle, nageurs ────────────────────────

export type RepresentationFraction = "chiffres" | "lettres" | "bande" | "disque";
export type MaterielFraction = "cartes" | "bandes" | "regle" | "nageurs" | "mesurer" | "tracer" | "comparer" | "operations";
/** Ce qu'on compare ou calcule : même dénominateur, numérateur 1 (comparer), ou un dénominateur multiple de l'autre (CE2). */
export type CasFractions = "denominateur" | "unitaires" | "multiple";
export type Graduation = 4 | 8 | 10;

export interface ReglagesFractions {
  denominateurs: number[];
  representations: RepresentationFraction[];
  materiel: MaterielFraction[];
  /** La règle graduée, les nageurs, les segments : en quarts, en huitièmes ou en dixièmes d'unité. */
  graduation: Graduation;
  /** Les cartes des seules fractions unitaires — un demi, un tiers… — : celles du début du CE1. */
  unitaires?: boolean;
  /** Pour comparer, ajouter, retrancher : les cas de la classe. */
  cas?: CasFractions;
}

export const REGLAGES_FRACTIONS: ReglagesFractions = {
  denominateurs: [2, 3, 4], representations: ["chiffres", "lettres", "bande"], materiel: ["cartes"], graduation: 4,
};

const fractionHtml = (k: number, n: number) => `<div class="fr-chiffres"><span>${k}</span><span class="fr-trait"></span><span>${n}</span></div>`;

export function bandeSvg(k: number, n: number, largeur = 100): string {
  const w = largeur, h = 22;
  const parts = Array.from({ length: n }, (_, i) =>
    `<rect x="${(i * w) / n}" y="0" width="${w / n}" height="${h}" fill="${i < k ? "#6366f1" : "#fff"}" stroke="#1c2233" stroke-width="1.5"/>`).join("");
  return `<svg viewBox="-1 -1 ${w + 2} ${h + 2}" width="34mm" height="8mm">${parts}</svg>`;
}

export function disqueSvg(k: number, n: number): string {
  const cx = 50, cy = 50, R = 46;
  const parts = Array.from({ length: n }, (_, i) => {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const grand = 1 / n > 0.5 ? 1 : 0;
    const d = n === 1 ? `M${cx} ${cy} m-${R} 0 a${R} ${R} 0 1 0 ${2 * R} 0 a${R} ${R} 0 1 0 -${2 * R} 0`
      : `M${cx} ${cy} L${(cx + Math.cos(a0) * R).toFixed(2)} ${(cy + Math.sin(a0) * R).toFixed(2)} A${R} ${R} 0 ${grand} 1 ${(cx + Math.cos(a1) * R).toFixed(2)} ${(cy + Math.sin(a1) * R).toFixed(2)} Z`;
    return `<path d="${d}" fill="${i < k ? "#6366f1" : "#fff"}" stroke="#1c2233" stroke-width="1.5"/>`;
  }).join("");
  return `<svg viewBox="0 0 100 100" width="22mm" height="22mm">${parts}</svg>`;
}

export interface CarteFraction { k: number; n: number; representation: RepresentationFraction; html: string }

export function cartesFractions(r: ReglagesFractions): CarteFraction[] {
  const sortie: CarteFraction[] = [];
  for (const n of r.denominateurs) {
    for (let k = 1; k < (r.unitaires ? 2 : n); k++) {
      for (const rep of r.representations) {
        const html = rep === "chiffres" ? fractionHtml(k, n)
          : rep === "lettres" ? `<div class="fr-lettres">${escapeHtml(fractionEnLettres(k, n))}</div>`
          : rep === "bande" ? bandeSvg(k, n) : disqueSvg(k, n);
        sortie.push({ k, n, representation: rep, html });
      }
    }
  }
  return sortie;
}

/** L'unité de la règle et des segments : 5 cm, pour qu'une règle de trois unités tienne dans la largeur de la page. */
export const UNITE_MM = 50;

/** Le nom des parts d'une graduation : « quarts », « huitièmes », « dixièmes ». */
export const nomDesParts = (g: Graduation) => (g === 4 ? "quarts" : g === 8 ? "huitièmes" : "dixièmes");

/** La règle graduée, trois unités, en quarts, en huitièmes ou en dixièmes. */
export function regleSvg(graduation: Graduation, unites = 3, uMm = UNITE_MM): string {
  const w = unites * uMm * 4, h = 60; // 4 px par mm
  let corps = `<rect x="0" y="0" width="${w + 40}" height="${h}" fill="#fff" stroke="#1c2233" stroke-width="2"/>`;
  for (let u = 0; u <= unites; u++) {
    const x = 20 + u * uMm * 4;
    corps += `<line x1="${x}" y1="0" x2="${x}" y2="34" stroke="#1c2233" stroke-width="2.5"/><text x="${x}" y="52" text-anchor="middle" font-size="16" font-family="Helvetica, Arial, sans-serif">${u} u</text>`;
    if (u === unites) break;
    for (let g = 1; g < graduation; g++) {
      const xg = x + (g / graduation) * uMm * 4;
      // La demi-unité, plus longue : elle aide à lire les huitièmes et les dixièmes.
      const moitie = graduation !== 4 && g === graduation / 2;
      corps += `<line x1="${xg}" y1="0" x2="${xg}" y2="${moitie ? 26 : 16}" stroke="#1c2233" stroke-width="${moitie ? 2 : 1.2}"/>`;
    }
  }
  return `<svg viewBox="0 0 ${w + 40} ${h}" width="${(w + 40) / 4}mm" height="${h / 4}mm">${corps}</svg>`;
}

/** Les cartes de la course des nageurs : des longueurs en fractions d'unité, de 1/10 à 1 u + 9/10. */
export function cartesNageurs(graduation: Graduation): string[] {
  const sortie: string[] = [];
  for (let entier = 0; entier <= 1; entier++) {
    for (let k = 1; k < graduation; k++) {
      sortie.push(`<div class="fr-nageur">${entier ? `<span class="fr-entier">1 u +</span>` : ""}${fractionHtml(k, graduation)}<span class="fr-u">u</span></div>`);
    }
  }
  return sortie;
}

// ── Mesurer et tracer des segments en fractions d'unité (livret CE2) ─────

/** Une longueur en parts d'unité : 7 quarts, c'est « 1 u + 3/4 u ». `simplifier` l'écrit en demis et en quarts quand c'est possible. */
export function longueurEnUnites(k: number, g: Graduation, simplifier = false): string {
  const entier = Math.floor(k / g), reste = k % g;
  if (!reste) return `${entier} u`;
  let [num, den] = [reste, g as number];
  if (simplifier) for (const d of [4, 2]) if (num % d === 0 && den % d === 0) { num /= d; den /= d; }
  const fraction = `${fractionHtml(num, den)}<span class="fr-u">u</span>`;
  return entier ? `<span class="fr-entier">${entier} u +</span> ${fraction}` : fraction;
}

/** Des longueurs, en parts d'unité, toutes différentes : une plus petite que l'unité, une d'unités entières, les autres entre deux. */
export function longueursAMesurer(g: Graduation, combien: number, graine: number): number[] {
  const alea = hasard(graine);
  const sortie = new Set<number>([1 + Math.floor(alea() * (g - 1)), g * (1 + Math.floor(alea() * 2))]);
  for (let garde = 0; sortie.size < combien && garde < 500; garde++) {
    const k = 1 + Math.floor(alea() * (3 * g - 1));
    if (k % g) sortie.add(k);
  }
  return melanger(alea, [...sortie]);
}

const LETTRES_SEGMENTS = "ABCDEFGH";

/** Un segment de k parts d'unité, avec ses extrémités marquées. */
function segmentSvg(k: number, g: Graduation): string {
  const l = (k / g) * UNITE_MM;
  return `<svg viewBox="-2 -4 ${l + 4} 8" width="${l + 4}mm" height="8mm"><line x1="0" y1="0" x2="${l}" y2="0" stroke="#d33a32" stroke-width="1.2"/>`
    + `<line x1="0" y1="-3" x2="0" y2="3" stroke="#1c2233" stroke-width="0.6"/><line x1="${l}" y1="-3" x2="${l}" y2="3" stroke="#1c2233" stroke-width="0.6"/></svg>`;
}

/**
 * Des segments à mesurer avec la bande unité pliée — ou la règle graduée — :
 * « Le segment A a pour longueur 1 unité et 3 quarts d'unité. » La bande
 * unité est sur la feuille, à découper et à plier.
 */
export function htmlSegmentsAMesurer(g: Graduation, graine: number): string {
  const longueurs = longueursAMesurer(g, 6, graine);
  const bande = `<div class="fr-unite"><span>1 u</span></div>`;
  const lignes = longueurs.map((k, i) => `<div class="fr-segment"><b>${LETTRES_SEGMENTS[i]}</b>${segmentSvg(k, g)}</div>
    <div class="fr-mesure">Le segment ${LETTRES_SEGMENTS[i]} a pour longueur : ............ u + ............ d'unité.</div>`).join("");
  const corrige = `<div class="page corrige"><div class="titre">Segments à mesurer — corrigé</div>
    ${longueurs.map((k, i) => `<div class="fr-corrige-ligne"><b>${LETTRES_SEGMENTS[i]}</b> ${longueurEnUnites(k, g)}</div>`).join("")}</div>`;
  return `<div class="page"><div class="titre">Mesurer des segments en ${nomDesParts(g)} d'unité</div>
    <div class="regle">Découpe la bande unité, puis plie-la en ${g === 4 ? "quatre" : g === 8 ? "huit" : "dix"} parties égales — ou prends la règle graduée en ${nomDesParts(g)}. Mesure chaque segment, en unités et en ${nomDesParts(g)} d'unité.
      <span class="reference">Livret Mathématiques CE2, Éduscol 2025.</span></div>
    <div class="sous">Prénom : ........................................ Date : ........................</div>${bande}${lignes}</div>${corrige}`;
}

/** Des longueurs à tracer : plus petites, égales ou plus grandes qu'une unité ; en huitièmes, des demis et des quarts à convertir. */
export function longueursATracer(g: Graduation, graine: number): number[] {
  // Sur une règle en huitièmes, le livret fait tracer des demis et des quarts : des multiples de deux huitièmes.
  const pas = g === 8 ? 2 : 1;
  const alea = hasard(graine);
  const sortie = new Set<number>([pas * (1 + Math.floor(alea() * (g / pas - 1))), g]);
  for (let garde = 0; sortie.size < 5 && garde < 500; garde++) {
    const k = pas * (1 + Math.floor(alea() * ((3 * g) / pas - 1)));
    if (k % g) sortie.add(k);
  }
  return melanger(alea, [...sortie]);
}

/** Des segments à tracer, depuis un point, avec la règle graduée ; le corrigé les montre à la bonne longueur. */
export function htmlSegmentsATracer(g: Graduation, longueurs: number[]): string {
  const simplifier = g === 8;
  const lignes = longueurs.map((k, i) => `<div class="fr-trace"><div class="fr-consigne">${LETTRES_SEGMENTS[i]}. Trace un segment de ${longueurEnUnites(k, g, simplifier)}</div>
    <div class="fr-depart"><span class="fr-point"></span></div></div>`).join("");
  const corrige = `<div class="page corrige"><div class="titre">Segments à tracer — corrigé</div>
    ${longueurs.map((k, i) => `<div class="fr-segment"><b>${LETTRES_SEGMENTS[i]}</b>${segmentSvg(k, g)}<span class="fr-mesure">${longueurEnUnites(k, g)}</span></div>`).join("")}</div>`;
  return `<div class="page"><div class="titre">Tracer des segments avec la règle graduée en ${nomDesParts(g)}</div>
    <div class="regle">Pose le zéro de ta règle sur le point, et trace chaque segment de la longueur demandée.${simplifier ? " Attention : les longueurs sont en demis et en quarts d'unité ; combien de huitièmes cela fait-il ?" : ""}
      <span class="reference">Livret Mathématiques CE2, Éduscol 2025.</span></div>
    <div class="sous">Prénom : ........................................ Date : ........................</div>${lignes}</div>${corrige}`;
}

// ── Comparer, ajouter, retrancher des fractions ───────────────────────────
//
// Les livrets programment, après les fractions unitaires, la comparaison des
// fractions — de même dénominateur, de numérateur 1 au CE1 ; dont l'un des
// dénominateurs est un multiple de l'autre au CE2 — puis leur somme et leur
// différence. Chaque fraction a sa bande, le tout de même longueur : on
// colorie, on compare, on calcule ; le corrigé montre les bandes coloriées.

/** Des dénominateurs dont l'un est un multiple de l'autre, pour le CE2. */
const MULTIPLES: [number, number][] = [[2, 4], [2, 8], [4, 8], [3, 6], [5, 10], [2, 6], [3, 12], [4, 12], [6, 12], [2, 10]];

type Fraction = [k: number, n: number];
const valeur = ([k, d]: Fraction) => k / d;

/** Une bande unité partagée en n parts ; coloriées : les k premières, puis m autres d'une seconde couleur. */
function bandeEnParts(n: number, k = 0, m = 0, mm = 64): string {
  const w = 160, h = 22;
  const parts = Array.from({ length: n }, (_, i) =>
    `<rect x="${(i * w) / n}" y="0" width="${w / n}" height="${h}" fill="${i < k ? "#6366f1" : i < k + m ? "#f59e0b" : "#fff"}" stroke="#1c2233" stroke-width="1.3"/>`).join("");
  return `<svg viewBox="-1 -1 ${w + 2} ${h + 2}" width="${mm}mm" height="${((mm * (h + 2)) / (w + 2)).toFixed(1)}mm">${parts}</svg>`;
}

const denominateursSurs = (ds: number[]) => (ds.filter((d) => d >= 2 && d <= 12).length ? ds.filter((d) => d >= 2 && d <= 12) : [2, 3, 4, 5, 6, 8, 10]);

/** Des paires de fractions à comparer, toutes différentes ; au CE2, parfois égales. */
export function fractionsAComparer(denominateurs: number[], cas: CasFractions, combien: number, graine: number): [Fraction, Fraction][] {
  const alea = hasard(graine);
  const ds = denominateursSurs(denominateurs);
  const pris = (l: number[]) => l[Math.floor(alea() * l.length)];
  const sortie: [Fraction, Fraction][] = [];
  const vues = new Set<string>();
  for (let garde = 0; sortie.length < combien && garde < 800; garde++) {
    let a: Fraction, b: Fraction;
    if (cas === "unitaires") {
      const d1 = pris(ds), d2 = pris(ds);
      if (d1 === d2) continue;
      [a, b] = [[1, d1], [1, d2]];
    } else if (cas === "denominateur") {
      const d = pris(ds.filter((x) => x >= 3).length ? ds.filter((x) => x >= 3) : [4]);
      const k1 = 1 + Math.floor(alea() * (d - 1)), k2 = 1 + Math.floor(alea() * (d - 1));
      if (k1 === k2) continue;
      [a, b] = [[k1, d], [k2, d]];
    } else {
      const [d1, d2] = MULTIPLES[Math.floor(alea() * MULTIPLES.length)];
      const k1 = 1 + Math.floor(alea() * (d1 - 1)), k2 = 1 + Math.floor(alea() * (d2 - 1));
      [a, b] = [[k1, d1], [k2, d2]];
    }
    if (alea() < 0.5) [a, b] = [b, a];
    const cle = `${a.join("/")}-${b.join("/")}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    sortie.push([a, b]);
  }
  return sortie;
}

const signeEntre = (a: Fraction, b: Fraction) => (Math.abs(valeur(a) - valeur(b)) < 1e-9 ? "=" : valeur(a) < valeur(b) ? "&lt;" : "&gt;");

export function htmlComparerFractions(r: ReglagesFractions, graine: number): string {
  const cas = r.cas ?? "denominateur";
  const paires = fractionsAComparer(r.denominateurs, cas, 8, graine);
  const membre = (f: Fraction, colorie: boolean) => `<div class="fr-membre">${fractionHtml(f[0], f[1])}${bandeEnParts(f[1], colorie ? f[0] : 0)}</div>`;
  const ligne = ([a, b]: [Fraction, Fraction], corrige: boolean) =>
    `<div class="fr-comparer">${membre(a, corrige)}<span class="fr-signe">${corrige ? signeEntre(a, b) : ""}</span>${membre(b, corrige)}</div>`;
  const regle = cas === "unitaires" ? "Le même tout, partagé en plus ou moins de parts : plus il y a de parts, plus chacune est petite."
    : cas === "denominateur" ? "Le même tout partagé de la même façon : on compte les parts prises."
      : "Les deux touts ont la même longueur ; l'un est partagé en deux fois, trois fois plus de parts : combien de petites parts font une grande ?";
  return `<div class="page"><div class="titre">Comparer des fractions</div>
    <div class="regle"><b>Colorie, puis compare</b>Colorie chaque fraction sur sa bande, puis écris &lt;, &gt; ou = entre les deux. ${regle}
      <span class="reference">Livrets Mathématiques CE1 et CE2, Éduscol 2025.</span></div>
    <div class="sous">Prénom : ........................................ Date : ........................</div>
    ${paires.map((p) => ligne(p, false)).join("")}</div>
    <div class="page corrige"><div class="titre">Comparer des fractions — corrigé</div>${paires.map((p) => ligne(p, true)).join("")}</div>`;
}

/** Une somme ou une différence de fractions, le résultat inférieur ou égal à 1. */
export interface OperationFractions { a: Fraction; b: Fraction; signe: "+" | "−"; resultat: Fraction }

export function operationsSurFractions(denominateurs: number[], cas: CasFractions, combien: number, graine: number): OperationFractions[] {
  const alea = hasard(graine);
  const ds = denominateursSurs(denominateurs).filter((d) => d >= 3);
  const sortie: OperationFractions[] = [];
  const vues = new Set<string>();
  for (let garde = 0; sortie.length < combien && garde < 800; garde++) {
    const plus = sortie.length % 3 !== 2;
    // Même dénominateur ; au CE2, l'un multiple de l'autre : on passe au plus grand.
    const [d1, d2] = cas === "multiple" ? MULTIPLES[Math.floor(alea() * MULTIPLES.length)] : (() => { const d = ds[Math.floor(alea() * ds.length)] ?? 4; return [d, d]; })();
    const k1 = 1 + Math.floor(alea() * (d1 - 1)), k2 = 1 + Math.floor(alea() * (d2 - 1));
    const enGrand = k1 * (d2 / d1);
    const total = plus ? enGrand + k2 : enGrand - k2;
    if (total <= 0 || total > d2) continue;
    const op: OperationFractions = { a: [k1, d1], b: [k2, d2], signe: plus ? "+" : "−", resultat: [total, d2] };
    const cle = `${op.a.join("/")}${op.signe}${op.b.join("/")}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    sortie.push(op);
  }
  return sortie;
}

export function htmlOperationsSurFractions(r: ReglagesFractions, graine: number): string {
  const ops = operationsSurFractions(r.denominateurs, r.cas === "multiple" ? "multiple" : "denominateur", 8, graine);
  const ligne = (o: OperationFractions, corrige: boolean) => {
    const enGrand = o.a[0] * (o.b[1] / o.a[1]);
    const bande = o.signe === "+" ? bandeEnParts(o.b[1], corrige ? enGrand : 0, corrige ? o.b[0] : 0) : bandeEnParts(o.b[1], corrige ? o.resultat[0] : 0, corrige ? o.b[0] : 0);
    return `<div class="fr-operation"><div class="fr-calcul">${fractionHtml(o.a[0], o.a[1])}<span class="fr-op">${o.signe}</span>${fractionHtml(o.b[0], o.b[1])}<span class="fr-op">=</span>${
      corrige ? fractionHtml(o.resultat[0], o.resultat[1]) : '<span class="fr-trou"></span>'}</div>${bande}</div>`;
  };
  return `<div class="page"><div class="titre">Ajouter et retrancher des fractions</div>
    <div class="regle"><b>Calcule</b>Tu peux colorier la bande pour t'aider : les parts de la première fraction, puis celles qu'on ajoute — ou qu'on enlève.
      ${r.cas === "multiple" ? "Quand les dénominateurs diffèrent, on écrit d'abord la première fraction avec les plus petites parts." : "Les parts sont de même taille : on ajoute, ou on enlève, des parts."}
      <span class="reference">Livrets Mathématiques CE1 et CE2, Éduscol 2025.</span></div>
    <div class="sous">Prénom : ........................................ Date : ........................</div>
    ${ops.map((o) => ligne(o, false)).join("")}</div>
    <div class="page corrige"><div class="titre">Ajouter et retrancher des fractions — corrigé</div>${ops.map((o) => ligne(o, true)).join("")}</div>`;
}

export function htmlFractions(r: ReglagesFractions, graine: number): string {
  const parties: string[] = [];
  if (r.materiel.includes("cartes")) {
    const cartes = melanger(hasard(graine), cartesFractions(r));
    const regle = `<div class="titre">Cartes des fractions — ${r.denominateurs.map((n) => `en ${fractionEnLettres(2, n).split(" ")[1]}`).join(", ")}</div>
      <div class="regle"><b>Jeu de mémoire</b>Cartes face cachée ; on en retourne deux : la même fraction sous deux formes différentes fait une paire. Cartes face visible d'abord, pour apprendre.
        <b style="margin-top:4px">Bataille des fractions</b>Chacun retourne une carte ; la plus grande fraction remporte le pli. Pour comparer, on regarde les dessins : pour un même tout partagé en parts égales, plus il y a de parts, plus chaque part est petite.
        <span class="reference">Livret Mathématiques CE1, Éduscol 2025.</span></div>`;
    parties.push(pagesDeCartes(cartes.map((c) => carte(c.html)), { colonnes: 4, lignes: 5 }, regle));
  }
  if (r.materiel.includes("bandes")) {
    const bande = (repere: string) => `<div class="fr-bande">${repere}</div>`;
    parties.push(`<div class="page"><div class="titre">Bandes unités à plier</div>
      <div class="regle">On plie la bande unité en deux, puis en quatre ; on marque les plis. Une bande pliée en dix pour les dixièmes.
        Les bandes repérées servent à vérifier. <span class="reference">Livret Mathématiques CE2, Éduscol 2025.</span></div>
      <div class="sous">Bandes vierges (1 u = 15 cm)</div>${[1, 2, 3, 4].map(() => bande("")).join("")}
      <div class="sous">Bande repérée en quarts</div>${bande(`<div class="fr-reperes">${[1, 2, 3].map((g) => `<span style="left:${g * 25}%"></span>`).join("")}</div>`)}
      <div class="sous">Bande repérée en dixièmes</div>${bande(`<div class="fr-reperes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => `<span style="left:${g * 10}%"></span>`).join("")}</div>`)}</div>`);
  }
  if (r.materiel.includes("regle")) {
    parties.push(`<div class="page"><div class="titre">Règle graduée en ${nomDesParts(r.graduation)} d'unité</div>
      <div class="regle">Une règle où l'unité vaut 5 cm, graduée en ${nomDesParts(r.graduation)} : pour mesurer et tracer des longueurs quand les entiers ne suffisent plus. À découper et coller sur du carton.
        <span class="reference">Livret Mathématiques CE2, Éduscol 2025.</span></div>
      <div style="margin:8mm 0">${regleSvg(r.graduation)}</div><div style="margin:8mm 0">${regleSvg(r.graduation)}</div><div style="margin:8mm 0">${regleSvg(r.graduation)}</div></div>`);
  }
  if (r.materiel.includes("nageurs")) {
    const regle = `<div class="titre">La course des nageurs</div>
      <div class="regle"><b>Règle du jeu</b>Par groupes de trois, sur une feuille A3. À son tour, on pioche une carte et on trace, depuis le bord de départ puis depuis l'extrémité de son dernier segment, un segment de la longueur indiquée, avec la règle graduée.
        Le premier qui atteint ou dépasse l'autre bord a gagné — on finit le tour, il peut y avoir des ex aequo. Une ligne bien droite va plus vite qu'une ligne brisée.
        <span class="reference">Livret Mathématiques CE2, Éduscol 2025.</span></div>`;
    parties.push(pagesDeCartes(cartesNageurs(r.graduation).map((c) => carte(c)), { colonnes: 3, lignes: 6, hauteurMm: 38 }, regle));
  }
  if (r.materiel.includes("mesurer")) parties.push(htmlSegmentsAMesurer(r.graduation, graine));
  if (r.materiel.includes("tracer")) parties.push(htmlSegmentsATracer(r.graduation, longueursATracer(r.graduation, graine)));
  if (r.materiel.includes("comparer")) parties.push(htmlComparerFractions(r, graine));
  if (r.materiel.includes("operations")) parties.push(htmlOperationsSurFractions(r, graine));
  return feuille(parties.join(""), "fr");
}

// ── Le jeu de l'oie et le dé ──────────────────────────────────────────────

export type ContenuOie = "nombres" | "lettres" | "syllabes" | "vide";
export type FacesDe = "constellations" | "chiffres" | "1-3" | "aucun";

export interface ReglagesOie {
  cases: number;
  contenu: ContenuOie;
  /** Les lettres ou syllabes à répartir, séparées par des espaces ou des virgules. */
  items: string;
  evenements: boolean;
  de: FacesDe;
}

export const REGLAGES_OIE: ReglagesOie = { cases: 30, contenu: "nombres", items: "", evenements: true, de: "constellations" };

export interface CaseOie { n: number; texte: string; evenement?: string }

const EVENEMENTS = ["Avance de 2", "Recule de 1", "Rejoue", "Passe ton tour", "Avance de 3", "Recule de 2"];

export const itemsDeLaListe = (saisie: string) => (saisie ?? "").split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);

export function casesOie(r: ReglagesOie, graine: number): CaseOie[] {
  const alea = hasard(graine);
  const items = itemsDeLaListe(r.items);
  const cases: CaseOie[] = [];
  for (let n = 1; n <= r.cases; n++) {
    let texte = "";
    if (r.contenu === "nombres") texte = String(n);
    else if (r.contenu !== "vide" && items.length) texte = items[(n - 1) % items.length];
    cases.push({ n, texte });
  }
  if (r.evenements) {
    // Un événement toutes les cinq cases environ, jamais au départ ni à l'arrivée.
    for (let n = 4; n < r.cases; n += 4 + Math.floor(alea() * 3)) {
      cases[n - 1].evenement = EVENEMENTS[Math.floor(alea() * EVENEMENTS.length)];
    }
  }
  return cases;
}

/** La piste en serpentin : six cases par rangée, la rangée suivante repart de l'autre côté. */
export function pisteSvg(cases: CaseOie[]): string {
  const parLigne = 6, taille = 110;
  const lignes = Math.ceil(cases.length / parLigne);
  const w = parLigne * taille, h = lignes * taille;
  const corps = cases.map((c, i) => {
    const ligne = Math.floor(i / parLigne);
    const col = ligne % 2 === 0 ? i % parLigne : parLigne - 1 - (i % parLigne);
    const x = col * taille, y = ligne * taille;
    const depart = i === 0, arrivee = i === cases.length - 1;
    const fond = depart || arrivee ? "#eef0fe" : c.evenement ? "#fff7d6" : "#fff";
    const libelle = depart ? "Départ" : arrivee ? "Arrivée" : "";
    return `<rect x="${x + 2}" y="${y + 2}" width="${taille - 4}" height="${taille - 4}" rx="10" fill="${fond}" stroke="#1c2233" stroke-width="2"/>
      <text x="${x + 10}" y="${y + 20}" font-size="12" fill="#687087" font-family="Helvetica, Arial, sans-serif">${c.n}</text>
      ${libelle ? `<text x="${x + taille / 2}" y="${y + taille / 2 + 6}" text-anchor="middle" font-size="16" font-weight="700" font-family="Helvetica, Arial, sans-serif">${libelle}</text>` : ""}
      ${!libelle && c.texte ? `<text x="${x + taille / 2}" y="${y + taille / 2 + (c.evenement ? 0 : 10)}" text-anchor="middle" font-size="${c.texte.length > 3 ? 22 : 30}" font-weight="700" font-family="Helvetica, Arial, sans-serif">${escapeHtml(c.texte)}</text>` : ""}
      ${c.evenement ? `<text x="${x + taille / 2}" y="${y + taille - 14}" text-anchor="middle" font-size="11" font-weight="600" fill="#8a5a00" font-family="Helvetica, Arial, sans-serif">${escapeHtml(c.evenement)}</text>` : ""}`;
  }).join("");
  return `<svg viewBox="0 0 ${w} ${h}" width="${w / 4}mm" height="${h / 4}mm">${corps}</svg>`;
}

/** Le patron d'un dé, en croix, à plier et coller. */
/**
 * Le patron du dé. `dessin`, s'il est donné, pose autre chose sur chaque
 * face — un picto et son mot, pour un dé à raconter (voir aidesALaTache.ts) ;
 * `largeurMm` l'agrandit.
 */
export function patronDeSvg(faces: FacesDe, dessin?: (i: number, x: number, y: number, c: number) => string, largeurMm = 120): string {
  const c = 110;
  const positions: [number, number][] = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];
  const valeurs = faces === "1-3" ? [1, 2, 3, 1, 2, 3] : [1, 2, 3, 4, 5, 6];
  const places: Record<number, [number, number][]> = {
    1: [[55, 55]], 2: [[30, 30], [80, 80]], 3: [[30, 30], [55, 55], [80, 80]], 4: [[30, 30], [80, 30], [30, 80], [80, 80]],
    5: [[30, 30], [80, 30], [55, 55], [30, 80], [80, 80]], 6: [[30, 30], [80, 30], [30, 55], [80, 55], [30, 80], [80, 80]],
  };
  const corps = positions.map(([col, ligne], i) => {
    const x = col * c, y = ligne * c, v = valeurs[i];
    const contenu = dessin ? dessin(i, x, y, c) : faces === "chiffres"
      ? `<text x="${x + 55}" y="${y + 70}" text-anchor="middle" font-size="44" font-weight="700" font-family="Helvetica, Arial, sans-serif">${v}</text>`
      : (places[v] ?? []).map(([px, py]) => `<circle cx="${x + px}" cy="${y + py}" r="9" fill="#1c2233"/>`).join("");
    return `<rect x="${x}" y="${y}" width="${c}" height="${c}" fill="#fff" stroke="#1c2233" stroke-width="2"/>${contenu}`;
  }).join("");
  // Les languettes de collage.
  const languettes = `<path d="M${c} 0 l-14 14 v82 l14 14 M${3 * c} ${c} l14 14 v82 l-14 14 M${2 * c} ${2 * c} l14 0 v82 l-14 14 M${c} ${3 * c} l0 14 h${c} l0 -14" fill="none" stroke="#9aa0b4" stroke-dasharray="4 3"/>`;
  return `<svg viewBox="-20 -20 ${4 * c + 40} ${3 * c + 40}" width="${largeurMm}mm" height="${(largeurMm * 3) / 4}mm">${corps}${languettes}</svg>`;
}

export function htmlJeuDeLOie(r: ReglagesOie, graine: number): string {
  const cases = casesOie(r, graine);
  const quoi = r.contenu === "nombres" ? "les nombres" : r.contenu === "lettres" ? "les lettres" : r.contenu === "syllabes" ? "les syllabes" : "";
  const regle = `<div class="titre">Jeu de l'oie${quoi ? ` — ${quoi}` : ""}</div>
    <div class="regle"><b>Règle du jeu</b>Chacun lance le dé et avance son pion d'autant de cases${quoi ? ` ; on lit ce que dit la case où l'on arrive` : ""}.
      Les cases jaunes font avancer, reculer, rejouer ou passer son tour. Le premier arrivé a gagné.
      <span class="reference">Livrets « Résolution de problèmes » (la piste du type jeu de l'oie, pour les déplacements) et Français CP (le jeu de l'oie des lettres), Éduscol 2025.</span></div>`;
  const de = r.de === "aucun" ? "" : `<div class="page"><div class="titre">Le dé — patron à plier</div>
    <div class="regle">Découper sur les traits pleins, plier sur les traits des faces, coller les languettes. ${r.de === "1-3" ? "Les faces vont de 1 à 3, deux fois : pour les petits déplacements." : r.de === "chiffres" ? "Les faces portent les chiffres." : "Les faces portent les constellations, comme un dé ordinaire."}
      <span class="reference">Programme de l'école maternelle 2025 : apprendre en jouant, jeux de société.</span></div>
    <div style="text-align:center;margin-top:6mm">${patronDeSvg(r.de)}</div></div>`;
  return feuille(`<div class="page">${regle}<div style="text-align:center;margin-top:4mm">${pisteSvg(cases)}</div></div>${de}`, "oie");
}

export const STYLE_JEUX_MATHS = `
  .feuille.nb .nb-chiffre { font-size: 46px; font-weight: 800; line-height: 1; }
  .feuille.nb .nb-mot { font-size: 20px; font-weight: 700; }
  .feuille.nb .nb-deco { font-size: 26px; font-weight: 700; }
  .feuille.ca .ca-question { font-size: 30px; font-weight: 700; }
  .feuille.ca .ca-reponse { font-size: 34px; font-weight: 800; }
  .feuille.ca .ca-corrige { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 16px; font-size: 14px; }
  .feuille.ar .ar-grille { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; margin-top: 4mm; }
  .feuille.ar .ar-arbre { border: 1px solid #cfd4e2; border-radius: 3mm; padding: 4mm; page-break-inside: avoid; }
  .feuille.ar .ar-ligne { display: flex; align-items: center; justify-content: center; gap: 2mm; margin: 2.5mm 0; font-size: 17px; font-weight: 600; flex-wrap: wrap; }
  .feuille.ar .ar-boite { display: inline-flex; align-items: center; justify-content: center; min-width: 12mm; height: 10mm; border: 1.5px solid #1c2233; border-radius: 2mm; padding: 0 2mm; font-size: 16px; }
  .feuille.ar .ar-total { min-width: 16mm; border-width: 2.5px; }
  .feuille.ar .ar-branches { gap: 1.5mm; }
  .feuille.ar .ar-branches .ar-boite { border-style: dashed; }
  .feuille.ar .ar-plus { margin: 0 3mm; }
  .feuille.ar .ar-sep { width: 6mm; }
  .feuille.fr .fr-chiffres { display: inline-flex; flex-direction: column; align-items: center; font-size: 26px; font-weight: 700; line-height: 1.05; }
  .feuille.fr .fr-trait { display: block; width: 100%; border-top: 2.5px solid #1c2233; margin: 1px 0; }
  .feuille.fr .fr-lettres { font-size: 18px; font-weight: 700; }
  .feuille.fr .fr-bande { height: 12mm; width: 150mm; border: 1.5px solid #1c2233; margin: 3mm 0 5mm; position: relative; }
  .feuille.fr .fr-reperes span { position: absolute; top: 0; bottom: 0; border-left: 1px dashed #9aa0b4; }
  .feuille.fr .fr-nageur { display: flex; align-items: center; gap: 3mm; }
  .feuille.fr .fr-entier { font-size: 24px; font-weight: 700; }
  .feuille.fr .fr-u { font-size: 24px; font-weight: 700; }
  .feuille.fr .fr-unite { width: 50mm; height: 9mm; border: 1.5px dashed #1c2233; display: flex; align-items: center; justify-content: center; margin: 2mm 0 5mm; font-weight: 700; }
  .feuille.fr .fr-segment { display: flex; align-items: center; gap: 4mm; margin: 5mm 0 1mm; }
  .feuille.fr .fr-segment b { width: 6mm; font-size: 16px; }
  .feuille.fr .fr-mesure { font-size: 13px; color: #3b4256; margin: 0 0 3mm 10mm; }
  .feuille.fr .fr-corrige-ligne { display: flex; align-items: center; gap: 4mm; margin: 3mm 0; }
  .feuille.fr .fr-trace { margin: 0 0 6mm; page-break-inside: avoid; }
  .feuille.fr .fr-consigne { display: flex; align-items: center; gap: 2mm; font-size: 14px; font-weight: 600; }
  .feuille.fr .fr-depart { height: 12mm; border-bottom: 1px dotted #c4c9d6; display: flex; align-items: center; }
  .feuille.fr .fr-point { width: 2.4mm; height: 2.4mm; border-radius: 50%; background: #1c2233; margin-left: 4mm; }
  .feuille.fr .fr-consigne .fr-chiffres, .feuille.fr .fr-mesure .fr-chiffres, .feuille.fr .fr-corrige-ligne .fr-chiffres { font-size: 15px; }
  .feuille.fr .fr-consigne .fr-entier, .feuille.fr .fr-consigne .fr-u, .feuille.fr .fr-mesure .fr-entier, .feuille.fr .fr-mesure .fr-u,
  .feuille.fr .fr-corrige-ligne .fr-entier, .feuille.fr .fr-corrige-ligne .fr-u { font-size: 15px; }
  .feuille.fr .fr-comparer { display: grid; grid-template-columns: 1fr 16mm 1fr; align-items: center; gap: 4mm; margin: 0 0 5mm; page-break-inside: avoid; }
  .feuille.fr .fr-membre { display: flex; align-items: center; gap: 4mm; }
  .feuille.fr .fr-signe { width: 13mm; height: 11mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; }
  .feuille.fr .fr-operation { display: flex; align-items: center; justify-content: space-between; gap: 6mm; margin: 0 0 5mm; page-break-inside: avoid; }
  .feuille.fr .fr-calcul { display: flex; align-items: center; gap: 3mm; }
  .feuille.fr .fr-op { font-size: 24px; font-weight: 700; }
  .feuille.fr .fr-trou { display: inline-block; width: 12mm; height: 15mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; }
`;
