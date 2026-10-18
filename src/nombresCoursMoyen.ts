// Les nombres du cours moyen : les exercices que le programme de 2025 et ses
// exemples de réussite (Éduscol, « Exemples pour la mise en œuvre des
// programmes », CM1 et CM2) demandent — les fractions plus grandes que 1, la
// fraction d'une quantité, comparer et ajouter des fractions, les fractions
// décimales et l'écriture à virgule, la partie entière et l'arrondi, la
// demi-droite graduée, les multiples et les diviseurs, ranger. Les nombres
// sont tirés au sort ; le corrigé suit, sur sa page.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { choisir, entier, fr } from "./nombres";
import { escapeHtml } from "./print";

export type ExerciceCM =
  | "fraction-en-somme" | "somme-en-fraction" | "encadrer-fraction" | "fraction-d-une-quantite"
  | "comparer-fractions" | "ajouter-fractions" | "produit-fraction"
  | "decimale-en-virgule" | "virgule-en-decimale" | "partie-entiere-arrondi"
  | "demi-droite" | "multiples" | "diviseurs" | "ranger";

export const EXERCICES_CM: { id: ExerciceCM; libelle: string }[] = [
  { id: "fraction-en-somme", libelle: "Une fraction plus grande que 1 : un entier plus une fraction" },
  { id: "somme-en-fraction", libelle: "Un entier plus une fraction : une seule fraction" },
  { id: "encadrer-fraction", libelle: "Encadrer une fraction entre deux entiers" },
  { id: "fraction-d-une-quantite", libelle: "La fraction d'une quantité" },
  { id: "comparer-fractions", libelle: "Comparer des fractions" },
  { id: "ajouter-fractions", libelle: "Additionner et soustraire des fractions" },
  { id: "produit-fraction", libelle: "Le produit d'un entier et d'une fraction" },
  { id: "decimale-en-virgule", libelle: "D'une fraction décimale à l'écriture à virgule" },
  { id: "virgule-en-decimale", libelle: "De l'écriture à virgule à la fraction décimale" },
  { id: "partie-entiere-arrondi", libelle: "La partie entière et l'arrondi à l'unité" },
  { id: "demi-droite", libelle: "La demi-droite graduée" },
  { id: "multiples", libelle: "Multiple de… ? diviseur de… ?" },
  { id: "diviseurs", libelle: "Tous les diviseurs, les multiples communs" },
  { id: "ranger", libelle: "Ranger des nombres" },
];

export interface ReglagesNombresCM {
  classe: "CM1" | "CM2";
  exercices: ExerciceCM[];
  /** Combien d'items par exercice. */
  combien: number;
  /** La demi-droite : des entiers (et leur pas), des fractions (le dénominateur de l'unité partagée) ou des décimaux. */
  demiDroite?: { sorte: "entiers" | "fractions" | "decimaux"; pas?: number; denominateur?: number };
  /** La fraction d'une quantité : des fractions unitaires seulement — le CM1. */
  unitaires?: boolean;
  /** Les décimaux : jusqu'aux dixièmes, aux centièmes (le CM1) ou aux millièmes (le CM2). */
  decimales?: 1 | 2 | 3;
  /** Ranger des entiers ou des décimaux, et jusqu'où. */
  ranger?: { sorte: "entiers" | "decimaux"; jusqua: number };
  /** Comparer, ajouter : des dénominateurs égaux seulement, ou dont l'un est un multiple de l'autre. */
  memeDenominateur?: boolean;
  titre?: string;
}

export const REGLAGES_NOMBRES_CM: ReglagesNombresCM = {
  classe: "CM1", exercices: ["fraction-en-somme", "somme-en-fraction", "encadrer-fraction"], combien: 6,
};

// ── L'écriture des nombres ────────────────────────────────────────────────

/** Une fraction, écrite comme on l'écrit : le numérateur sur le dénominateur ; `?` laisse une case à remplir. */
export const frac = (k: number | string, n: number | string) => {
  const terme = (x: number | string) => (x === "?" ? '<span class="nc-case nc-petite"></span>' : typeof x === "number" ? fr(x) : x);
  return `<span class="nc-fr"><span>${terme(k)}</span><span class="nc-barre"></span><span>${terme(n)}</span></span>`;
};
const CASE = '<span class="nc-case"></span>';
const SIGNE = '<span class="nc-case nc-signe"></span>';
/** Un décimal donné en millièmes, écrit à la française et sans zéro inutile : 4,17 ; 3,05 ; 12,4. */
export const decimal = (milliemes: number, decimales: number) => {
  const d = 10 ** decimales;
  const brut = fr(Math.trunc(milliemes / (1000 / d)) / d, decimales);
  return decimales > 0 ? brut.replace(/,?0+$/, "") : brut;
};

const DENOMINATEURS_CM1 = [2, 3, 4, 5, 6, 8, 10];
const DENOMINATEURS_CM2 = [2, 3, 4, 5, 6, 8, 10, 12];
const denominateurs = (r: ReglagesNombresCM) => (r.classe === "CM1" ? DENOMINATEURS_CM1 : DENOMINATEURS_CM2);

/** Une fraction plus grande que 1, qui n'est pas un entier : 7/4, 16/3. */
function fractionPlusGrande(alea: () => number, r: ReglagesNombresCM): [number, number] {
  const n = choisir(alea, denominateurs(r));
  const e = entier(alea, 1, r.classe === "CM1" ? 4 : 6);
  const reste = entier(alea, 1, n - 1);
  return [e * n + reste, n];
}

// ── Les exercices ─────────────────────────────────────────────────────────

interface Bloc { consigne: string; corps: string; corrige: string }

const lignes = (items: string[]) => `<div class="nc-lignes">${items.map((x) => `<div>${x}</div>`).join("")}</div>`;
const grille = (items: string[]) => `<div class="nc-grille">${items.map((x) => `<div>${x}</div>`).join("")}</div>`;

/** Des items tous différents, tirés jusqu'à en avoir `combien`. */
function distincts<T>(combien: number, tirer: () => T, cle: (x: T) => string): T[] {
  const sortie: T[] = [];
  const vus = new Set<string>();
  for (let garde = 0; sortie.length < combien && garde < 500; garde++) {
    const x = tirer();
    if (vus.has(cle(x))) continue;
    vus.add(cle(x));
    sortie.push(x);
  }
  return sortie;
}

function fractionEnSomme(alea: () => number, r: ReglagesNombresCM): Bloc {
  const items = distincts(r.combien, () => fractionPlusGrande(alea, r), (x) => x.join("/"));
  return {
    consigne: "Écris chaque fraction comme la somme d'un nombre entier et d'une fraction plus petite que 1.",
    corps: grille(items.map(([k, n]) => `${frac(k, n)} = ${CASE} + ${frac("?", n)}`)),
    corrige: grille(items.map(([k, n]) => `${frac(k, n)} = <b>${Math.floor(k / n)}</b> + ${frac(k % n, n)}`)),
  };
}

function sommeEnFraction(alea: () => number, r: ReglagesNombresCM): Bloc {
  const items = distincts(r.combien, () => fractionPlusGrande(alea, r), (x) => x.join("/"));
  return {
    consigne: "Écris chaque somme comme une seule fraction.",
    corps: grille(items.map(([k, n]) => `${Math.floor(k / n)} + ${frac(k % n, n)} = ${frac("?", n)}`)),
    corrige: grille(items.map(([k, n]) => `${Math.floor(k / n)} + ${frac(k % n, n)} = ${frac(k, n)}`)),
  };
}

function encadrerFraction(alea: () => number, r: ReglagesNombresCM): Bloc {
  const items = distincts(r.combien, () => fractionPlusGrande(alea, r), (x) => x.join("/"));
  return {
    consigne: "Encadre chaque fraction entre deux nombres entiers qui se suivent.",
    corps: grille(items.map(([k, n]) => `${CASE} &lt; ${frac(k, n)} &lt; ${CASE}`)),
    corrige: grille(items.map(([k, n]) => `<b>${Math.floor(k / n)}</b> &lt; ${frac(k, n)} &lt; <b>${Math.floor(k / n) + 1}</b>`)),
  };
}

/** Des quantités qu'on partage : celles des exemples de réussite — des œufs, de la farine, du sable, des mètres. */
const QUANTITES: { quoi: string; unite: string; multiples: number[] }[] = [
  { quoi: "œufs", unite: "œufs", multiples: [1] },
  { quoi: "billes", unite: "billes", multiples: [1] },
  { quoi: "g de farine", unite: "g", multiples: [10, 50, 100] },
  { quoi: "kg de sable", unite: "kg", multiples: [1, 5, 10] },
  { quoi: "m de ruban", unite: "m", multiples: [1, 2, 10] },
  { quoi: "€", unite: "€", multiples: [1, 5, 10] },
];

function fractionDUneQuantite(alea: () => number, r: ReglagesNombresCM): Bloc {
  const unitaires = r.unitaires ?? r.classe === "CM1";
  const items = distincts(r.combien, () => {
    const q = choisir(alea, QUANTITES);
    const n = choisir(alea, [2, 3, 4, 5, 10]);
    const k = unitaires ? 1 : entier(alea, 1, n - 1);
    const part = entier(alea, 2, 12) * choisir(alea, q.multiples);
    return { q, k, n, total: part * n, resultat: part * k };
  }, (x) => `${x.k}/${x.n}/${x.total}/${x.q.quoi}`);
  return {
    consigne: unitaires ? "Calcule. Dis comment tu fais : je partage en parts égales." : "Calcule. Prends d'abord une part, puis autant de parts que le dit le numérateur.",
    corps: lignes(items.map(({ q, k, n, total }) => `${frac(k, n)} de ${fr(total)} ${escapeHtml(q.quoi)}, c'est ${CASE} ${escapeHtml(q.unite)}.`)),
    corrige: lignes(items.map(({ q, k, n, total, resultat }) => `${frac(k, n)} de ${fr(total)} ${escapeHtml(q.quoi)}, c'est <b>${fr(resultat)}</b> ${escapeHtml(q.unite)}`
      + ` <span class="nc-aussi">(${fr(total)} ÷ ${n} = ${fr(total / n)}${k > 1 ? ` ; ${k} × ${fr(total / n)} = ${fr(resultat)}` : ""})</span>`)),
  };
}

/** Un numérateur jusqu'au double du dénominateur, qui ne fait pas un nombre entier : 7/4, pas 8/4. */
function numerateur(alea: () => number, n: number): number {
  let k = entier(alea, 1, 2 * n - 1);
  while (k % n === 0) k = entier(alea, 1, 2 * n - 1);
  return k;
}

/** Deux dénominateurs : égaux, ou l'un multiple de l'autre par un résultat des tables. */
function deuxDenominateurs(alea: () => number, r: ReglagesNombresCM): [number, number] {
  if (r.memeDenominateur) { const n = choisir(alea, denominateurs(r)); return [n, n]; }
  const n = choisir(alea, [2, 3, 4, 5, 6]);
  const m = n * choisir(alea, n <= 3 ? [2, 3, 4] : [2]);
  return alea() < 0.5 ? [n, m] : [m, n];
}

function comparerFractions(alea: () => number, r: ReglagesNombresCM): Bloc {
  const items = distincts(r.combien, () => {
    const sorte = alea();
    let a: [number, number], b: [number, number];
    if (sorte < 0.3) {
      // Même numérateur : la plus grande a les plus grandes parts.
      const k = entier(alea, 2, 9);
      const [n1, n2] = melanger(alea, denominateurs(r)).slice(0, 2);
      a = [k, n1]; b = [k, n2];
    } else {
      const [n1, n2] = deuxDenominateurs(alea, r);
      a = [numerateur(alea, n1), n1];
      // Une fois sur quatre, deux fractions égales écrites autrement : 3/4 et 6/8.
      b = n1 !== n2 && alea() < 0.25 && (a[0] * n2) % n1 === 0 ? [(a[0] * n2) / n1, n2] : [numerateur(alea, n2), n2];
    }
    return [a, b] as const;
  }, ([a, b]) => `${a.join("/")}-${b.join("/")}`);
  const signe = ([a, b]: readonly [[number, number], [number, number]]) => {
    const d = a[0] * b[1] - b[0] * a[1];
    return d < 0 ? "&lt;" : d > 0 ? "&gt;" : "=";
  };
  return {
    consigne: "Compare les fractions : écris &lt;, &gt; ou =. Explique un de tes choix à l'oral.",
    corps: grille(items.map(([a, b]) => `${frac(a[0], a[1])} ${SIGNE} ${frac(b[0], b[1])}`)),
    corrige: grille(items.map((x) => `${frac(x[0][0], x[0][1])} <b>${signe(x)}</b> ${frac(x[1][0], x[1][1])}`)),
  };
}

function ajouterFractions(alea: () => number, r: ReglagesNombresCM): Bloc {
  const valides = distincts(r.combien, () => {
    const [n1, n2] = deuxDenominateurs(alea, r);
    const grand = Math.max(n1, n2);
    let premiere = { k: numerateur(alea, n1), n: n1 }, seconde = { k: numerateur(alea, n2), n: n2 };
    const plus = alea() < 0.55;
    const enGrand = (f: { k: number; n: number }) => f.k * (grand / f.n);
    // Une différence ne descend pas sous zéro : la plus grande fraction vient devant.
    if (!plus && enGrand(premiere) < enGrand(seconde)) [premiere, seconde] = [seconde, premiere];
    const ga = enGrand(premiere), gb = enGrand(seconde);
    return { a: premiere.k, na: premiere.n, b: seconde.k, nb: seconde.n, plus, grand, ga, gb, resultat: plus ? ga + gb : ga - gb };
  }, (x) => `${x.a}/${x.na}${x.plus}${x.b}/${x.nb}`).filter((x) => x.resultat > 0);
  return {
    consigne: "Je calcule. J'écris d'abord les deux fractions avec le même dénominateur, quand il le faut.",
    corps: lignes(valides.map((x) => `${frac(x.a, x.na)} ${x.plus ? "+" : "−"} ${frac(x.b, x.nb)} = <span class="nc-trait"></span>`)),
    corrige: lignes(valides.map((x) => `${frac(x.a, x.na)} ${x.plus ? "+" : "−"} ${frac(x.b, x.nb)}`
      + (x.na !== x.grand || x.nb !== x.grand ? ` = ${frac(x.ga, x.grand)} ${x.plus ? "+" : "−"} ${frac(x.gb, x.grand)}` : "")
      + ` = <b>${frac(x.resultat, x.grand)}</b>`)),
  };
}

function produitFraction(alea: () => number, r: ReglagesNombresCM): Bloc {
  const items = distincts(r.combien, () => {
    const n = choisir(alea, denominateurs(r));
    return [entier(alea, 2, 9), entier(alea, 1, n - 1), n] as const;
  }, (x) => x.join("/"));
  return {
    consigne: "Calcule le produit. Pense : 3 fois deux cinquièmes, c'est six cinquièmes.",
    corps: grille(items.map(([e, k, n]) => `${e} × ${frac(k, n)} = ${frac("?", "?")}`)),
    corrige: grille(items.map(([e, k, n]) => `${e} × ${frac(k, n)} = <b>${frac(e * k, n)}</b>`)),
  };
}

/** Un décimal au sort, par ses millièmes : une partie entière, puis autant de chiffres après la virgule que la classe en connaît. */
function unDecimal(alea: () => number, decimales: number, max = 99): { milliemes: number; decimales: number } {
  const partie = entier(alea, 0, max);
  let apres = entier(alea, 1, 10 ** decimales - 1);
  while (decimales > 1 && apres % 10 === 0) apres = entier(alea, 1, 10 ** decimales - 1);
  return { milliemes: partie * 1000 + apres * (1000 / 10 ** decimales), decimales };
}

/** Les fractions décimales d'un nombre : 4 + 1/10 + 7/100. */
function decomposition(m: number, decimales: number): string {
  const partie = Math.trunc(m / 1000);
  const morceaux = [partie ? fr(partie) : ""];
  for (const d of [10, 100, 1000].slice(0, decimales)) {
    const chiffre = Math.trunc(m / (1000 / d)) % 10;
    if (chiffre) morceaux.push(frac(chiffre, d));
  }
  return morceaux.filter(Boolean).join(" + ");
}

function decimaleEnVirgule(alea: () => number, r: ReglagesNombresCM): Bloc {
  const decimales = r.decimales ?? (r.classe === "CM1" ? 2 : 3);
  const items = distincts(r.combien, () => unDecimal(alea, entier(alea, 1, decimales), 30), (x) => `${x.milliemes}`);
  const enFraction = (x: { milliemes: number; decimales: number }) => frac(x.milliemes / (1000 / 10 ** x.decimales), 10 ** x.decimales);
  return {
    consigne: "Décompose chaque fraction décimale, puis écris le nombre avec une virgule.",
    corps: lignes(items.map((x) => `${enFraction(x)} = <span class="nc-trait nc-court"></span> = ${CASE}`)),
    corrige: lignes(items.map((x) => `${enFraction(x)} = ${decomposition(x.milliemes, x.decimales)} = <b>${decimal(x.milliemes, x.decimales)}</b>`)),
  };
}

function virguleEnDecimale(alea: () => number, r: ReglagesNombresCM): Bloc {
  const decimales = r.decimales ?? (r.classe === "CM1" ? 2 : 3);
  const items = distincts(r.combien, () => unDecimal(alea, entier(alea, 1, decimales), 30), (x) => `${x.milliemes}`);
  return {
    consigne: "Écris chaque nombre comme une somme de fractions décimales, puis comme une seule fraction décimale.",
    corps: lignes(items.map((x) => `${decimal(x.milliemes, x.decimales)} = <span class="nc-trait nc-court"></span> = ${frac("?", "?")}`)),
    corrige: lignes(items.map((x) => `${decimal(x.milliemes, x.decimales)} = ${decomposition(x.milliemes, x.decimales)}`
      + ` = <b>${frac(x.milliemes / (1000 / 10 ** x.decimales), 10 ** x.decimales)}</b>`)),
  };
}

function partieEntiereArrondi(alea: () => number, r: ReglagesNombresCM): Bloc {
  const decimales = r.decimales ?? (r.classe === "CM1" ? 2 : 3);
  // Pas de nombre à mi-chemin, comme 4,5 : son arrondi demande une convention qu'on n'enseigne pas ici.
  const items = distincts(r.combien, () => unDecimal(alea, entier(alea, 1, decimales), 99), (x) => `${x.milliemes}`)
    .filter((x) => x.milliemes % 1000 !== 500);
  const ligne = (x: { milliemes: number; decimales: number }, corrige: boolean) => {
    const partie = Math.trunc(x.milliemes / 1000);
    const arrondi = x.milliemes % 1000 > 500 ? partie + 1 : partie;
    return `<tr><td>${decimal(x.milliemes, x.decimales)}</td><td>${corrige ? `<b>${fr(partie)}</b>` : ""}</td><td>${corrige ? `<b>${fr(arrondi)}</b>` : ""}</td></tr>`;
  };
  const tableau = (corrige: boolean) => `<table class="nc-tableau"><thead><tr><th>Le nombre</th><th>Sa partie entière</th><th>Son arrondi à l'unité</th></tr></thead>`
    + `<tbody>${items.map((x) => ligne(x, corrige)).join("")}</tbody></table>`;
  return { consigne: "Écris la partie entière de chaque nombre, puis son arrondi à l'unité : l'entier le plus proche.", corps: tableau(false), corrige: tableau(true) };
}

// ── La demi-droite graduée ────────────────────────────────────────────────

interface Point { nom: string; graduation: number }

/** Une demi-droite graduée en SVG : les graduations, quelques nombres écrits dessous, des points nommés au-dessus. */
function demiDroiteSvg(graduations: number, etiquettes: Map<number, string>, points: Point[], principales: (g: number) => boolean, reponses?: Map<string, string>): string {
  // De la marge à gauche pour le premier nombre écrit, centré sous sa graduation.
  const w = 170, x0 = 12, pas = (w - x0 - 8) / graduations, y = 20;
  const traits = Array.from({ length: graduations + 1 }, (_, g) => {
    const x = x0 + g * pas, haut = principales(g) ? 4.5 : 2.5;
    return `<line x1="${x}" y1="${y - haut}" x2="${x}" y2="${y + haut}" stroke="#1c2233" stroke-width="${principales(g) ? 0.6 : 0.35}"/>`;
  }).join("");
  const nombres = [...etiquettes].map(([g, t]) => `<text x="${x0 + g * pas}" y="${y + 10}" font-size="4" text-anchor="middle" fill="#1c2233">${escapeHtml(t)}</text>`).join("");
  // Au corrigé, les réponses de deux points voisins se décalent en hauteur, pour ne pas se chevaucher.
  const nommes = points.map((p, i) => {
    const x = x0 + p.graduation * pas;
    const reponse = reponses?.get(p.nom);
    const haut = i % 2 ? 17.5 : 12.5;
    return `<circle cx="${x}" cy="${y}" r="1.1" fill="#4f46e5"/><text x="${x}" y="${y - 7}" font-size="4.4" font-weight="700" text-anchor="middle" fill="#4f46e5">${p.nom}</text>`
      + (reponse ? `<text x="${x}" y="${y - haut}" font-size="3.6" text-anchor="middle" fill="#1c2233">${escapeHtml(reponse)}</text>` : "");
  }).join("");
  return `<svg class="nc-droite" viewBox="0 -4 ${w} 38" width="${w}mm" height="38mm"><line x1="${x0}" y1="${y}" x2="${w - 2}" y2="${y}" stroke="#1c2233" stroke-width="0.6"/>`
    + `<polygon points="${w - 2},${y} ${w - 5},${y - 1.6} ${w - 5},${y + 1.6}" fill="#1c2233"/>${traits}${nombres}${nommes}</svg>`;
}

function demiDroite(alea: () => number, r: ReglagesNombresCM): Bloc {
  const d = r.demiDroite ?? { sorte: r.classe === "CM1" ? "fractions" : "decimaux" };
  const noms = ["A", "B", "C", "D"];
  if (d.sorte === "entiers") {
    // Des graduations de un en un, de dix en dix… jusqu'à cent mille en cent mille : deux nombres écrits, cinq graduations
    // entre eux — on trouve le pas —, des points à lire ; tout reste dans les nombres de la classe.
    const pas = d.pas ?? choisir(alea, r.classe === "CM1" ? [10, 100, 1000, 10000] : [100, 1000, 10000, 100000]);
    const graduations = 12;
    const plafond = (r.classe === "CM1" ? 999_999 : 999_999_999) - graduations * pas;
    const depart = entier(alea, 0, Math.max(0, Math.floor(plafond / (10 * pas)))) * 10 * pas;
    const choisies = melanger(alea, Array.from({ length: graduations - 1 }, (_, i) => i + 1).filter((g) => g !== 5)).slice(0, 4).sort((a, b) => a - b);
    const points = choisies.map((g, i) => ({ nom: noms[i], graduation: g }));
    const etiquettes = new Map([[0, fr(depart)], [5, fr(depart + 5 * pas)]]);
    const reponses = new Map(points.map((p) => [p.nom, fr(depart + p.graduation * pas)]));
    return {
      consigne: "Lis le nombre de chaque point. Cherche d'abord de combien on avance d'une graduation à la suivante : cinq graduations séparent les deux nombres écrits.",
      corps: demiDroiteSvg(graduations, etiquettes, points, () => true) + lignes(points.map((p) => `${p.nom} : ${CASE}`)),
      corrige: demiDroiteSvg(graduations, etiquettes, points, () => true, reponses),
    };
  }
  if (d.sorte === "fractions") {
    // L'unité partagée en parts égales : des points à repérer par une fraction et par un entier plus une fraction.
    const n = d.denominateur ?? choisir(alea, [2, 3, 4, 5, 6, 8]);
    const unites = n <= 4 ? 4 : n <= 6 ? 3 : 2;
    const graduations = unites * n;
    const choisies = melanger(alea, Array.from({ length: graduations - 1 }, (_, i) => i + 1).filter((g) => g % n !== 0)).slice(0, 4).sort((a, b) => a - b);
    const points = choisies.map((g, i) => ({ nom: noms[i], graduation: g }));
    const etiquettes = new Map(Array.from({ length: unites + 1 }, (_, u) => [u * n, String(u)] as [number, string]));
    const reponses = new Map(points.map((p) => [p.nom, `${p.graduation}/${n}`]));
    return {
      consigne: `L'unité est partagée en ${n} parts égales. Écris le nombre de chaque point par une fraction, puis comme un entier plus une fraction.`,
      corps: demiDroiteSvg(graduations, etiquettes, points, (g) => g % n === 0) + lignes(points.map((p) => `${p.nom} : ${frac("?", n)} = ${CASE} + ${frac("?", n)}`)),
      corrige: demiDroiteSvg(graduations, etiquettes, points, (g) => g % n === 0, reponses)
        + lignes(points.map((p) => `${p.nom} : ${frac(p.graduation, n)} = <b>${Math.floor(p.graduation / n)}</b> + ${frac(p.graduation % n, n)}`)),
    };
  }
  // Des décimaux : deux unités partagées en dixièmes, à partir d'un entier.
  const depart = entier(alea, 0, r.classe === "CM1" ? 8 : 40);
  const graduations = 20;
  const choisies = melanger(alea, Array.from({ length: graduations - 1 }, (_, i) => i + 1).filter((g) => g % 10 !== 0)).slice(0, 4).sort((a, b) => a - b);
  const points = choisies.map((g, i) => ({ nom: noms[i], graduation: g }));
  const etiquettes = new Map([[0, String(depart)], [10, String(depart + 1)], [20, String(depart + 2)]]);
  const reponses = new Map(points.map((p) => [p.nom, decimal(depart * 1000 + p.graduation * 100, 1)]));
  return {
    consigne: "Chaque unité est partagée en dix : une graduation, c'est un dixième. Écris le nombre de chaque point avec une virgule.",
    corps: demiDroiteSvg(graduations, etiquettes, points, (g) => g % 10 === 0) + lignes(points.map((p) => `${p.nom} : ${CASE}`)),
    corrige: demiDroiteSvg(graduations, etiquettes, points, (g) => g % 10 === 0, reponses),
  };
}

// ── Multiples et diviseurs ────────────────────────────────────────────────

function multiples(alea: () => number, r: ReglagesNombresCM): Bloc {
  const items = distincts(r.combien, () => {
    const diviseur = choisir(alea, r.classe === "CM1" ? [2, 3, 4, 5, 6, 7, 8, 9, 10] : [3, 4, 6, 7, 8, 9]);
    const quotient = entier(alea, 6, r.classe === "CM1" ? 25 : 40);
    const reste = alea() < 0.5 ? 0 : entier(alea, 1, diviseur - 1);
    const nombre = diviseur * quotient + reste;
    const question = alea() < 0.5 ? `${fr(nombre)} est-il un multiple de ${diviseur} ?` : `${diviseur} est-il un diviseur de ${fr(nombre)} ?`;
    return { diviseur, quotient, reste, nombre, question };
  }, (x) => `${x.nombre}/${x.diviseur}`);
  const pourquoi = (x: (typeof items)[number]) => (x.diviseur === 2 || x.diviseur === 5 || x.diviseur === 10) && x.reste === 0
    ? `oui : son chiffre des unités le dit (${fr(x.nombre)} = ${x.diviseur} × ${fr(x.quotient)})`
    : x.reste === 0 ? `oui : ${x.diviseur} × ${fr(x.quotient)} = ${fr(x.nombre)}` : `non : ${fr(x.nombre)} = ${x.diviseur} × ${fr(x.quotient)} + ${x.reste}`;
  return {
    consigne: "Réponds par oui ou par non, et explique avec une multiplication ou le chiffre des unités.",
    corps: lignes(items.map((x) => `${escapeHtml(x.question)} <span class="nc-trait nc-court"></span>`)),
    corrige: lignes(items.map((x) => `${escapeHtml(x.question)} <b>${escapeHtml(pourquoi(x))}</b>`)),
  };
}

const diviseursDe = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);

function diviseurs(alea: () => number, r: ReglagesNombresCM): Bloc {
  const combien = Math.max(2, Math.min(r.combien, 6));
  // Des nombres qui ont des diviseurs à trouver, et des paires qui en partagent.
  const tous = distincts(Math.ceil(combien / 2), () => choisir(alea, [12, 15, 16, 18, 20, 21, 24, 27, 28, 30]), String);
  const communs = distincts(Math.floor(combien / 2), () => {
    const g = choisir(alea, [2, 3, 4, 5, 6]);
    const [x, y] = melanger(alea, Array.from({ length: Math.floor(30 / g) }, (_, i) => i + 1).filter((v) => v > 1)).slice(0, 2);
    return [g * x, g * y].sort((a, b) => a - b) as [number, number];
  }, (x) => x.join("-")).filter(([a, b]) => a !== b);
  const multiplesCommuns = (a: number, b: number) => Array.from({ length: 100 }, (_, i) => i + 1).filter((m) => m % a === 0 && m % b === 0).slice(0, 3);
  return {
    consigne: "Trouve tous les diviseurs ; puis les diviseurs communs aux deux nombres, et leurs trois premiers multiples communs.",
    corps: lignes([
      ...tous.map((n) => `Les diviseurs de ${n} : <span class="nc-trait"></span>`),
      ...communs.map(([a, b]) => `${a} et ${b} — diviseurs communs : <span class="nc-trait nc-court"></span> multiples communs : <span class="nc-trait nc-court"></span>`),
    ]),
    corrige: lignes([
      ...tous.map((n) => `Les diviseurs de ${n} : <b>${diviseursDe(n).join(", ")}</b>`),
      ...communs.map(([a, b]) => `${a} et ${b} — diviseurs communs : <b>${diviseursDe(a).filter((d) => b % d === 0).join(", ")}</b> ; multiples communs : <b>${multiplesCommuns(a, b).join(", ") || "plus de 100"}</b>`),
    ]),
  };
}

// ── Ranger ────────────────────────────────────────────────────────────────

function ranger(alea: () => number, r: ReglagesNombresCM): Bloc {
  const sorte = r.ranger?.sorte ?? "entiers";
  const jusqua = r.ranger?.jusqua ?? (r.classe === "CM1" ? 999_999 : 999_999_999);
  const decimales = r.decimales ?? (r.classe === "CM1" ? 2 : 3);
  const croissant = alea() < 0.5;
  // Des nombres proches, qui obligent à regarder chiffre à chiffre : la même longueur, ou presque.
  const base = sorte === "entiers" ? entier(alea, Math.floor(jusqua / 20), Math.floor(jusqua / 2)) : 0;
  const valeurs = sorte === "entiers"
    ? distincts(5, () => Math.min(jusqua, Math.max(1, base + choisir(alea, [1, 10, 100, 1000]) * entier(alea, 0, 99) * choisir(alea, [1, -1]))), String)
    : distincts(5, () => unDecimal(alea, entier(alea, 1, decimales), 9).milliemes, String);
  const ecrire = (v: number) => (sorte === "entiers" ? fr(v) : decimal(v, decimales));
  const tries = [...valeurs].sort((a, b) => (croissant ? a - b : b - a));
  const signe = croissant ? "&lt;" : "&gt;";
  return {
    consigne: `Range ces nombres dans l'ordre ${croissant ? "croissant, du plus petit au plus grand" : "décroissant, du plus grand au plus petit"}.`,
    corps: `<div class="nc-a-ranger">${valeurs.map(ecrire).join(" ; ")}</div>` + `<div class="nc-rangement">${tries.map(() => CASE).join(` ${signe} `)}</div>`,
    corrige: `<div class="nc-rangement"><b>${tries.map(ecrire).join(` ${signe} `)}</b></div>`,
  };
}

const FABRIQUES: Record<ExerciceCM, (alea: () => number, r: ReglagesNombresCM) => Bloc> = {
  "fraction-en-somme": fractionEnSomme, "somme-en-fraction": sommeEnFraction, "encadrer-fraction": encadrerFraction,
  "fraction-d-une-quantite": fractionDUneQuantite, "comparer-fractions": comparerFractions, "ajouter-fractions": ajouterFractions,
  "produit-fraction": produitFraction, "decimale-en-virgule": decimaleEnVirgule, "virgule-en-decimale": virguleEnDecimale,
  "partie-entiere-arrondi": partieEntiereArrondi, "demi-droite": demiDroite, multiples, diviseurs, ranger,
};

// ── La feuille ────────────────────────────────────────────────────────────

export function htmlNombresCM(r: ReglagesNombresCM, graine: number): string {
  const alea = hasard(graine);
  const reglages = { ...r, combien: Math.max(1, Math.min(10, r.combien)) };
  const titre = r.titre ?? "Les nombres";
  const exercices: string[] = [];
  const corriges: string[] = [];
  EXERCICES_CM.map((e) => e.id).filter((e) => r.exercices.includes(e)).forEach((ex, i) => {
    const b = FABRIQUES[ex](alea, reglages);
    exercices.push(`<div class="nc-exo"><div class="nc-consigne"><b>${i + 1}.</b> ${b.consigne}</div>${b.corps}</div>`);
    corriges.push(`<div class="nc-exo"><div class="nc-consigne"><b>${i + 1}.</b> ${b.consigne}</div>${b.corrige}</div>`);
  });
  return feuille(`<div class="page"><div class="titre">${escapeHtml(titre)}</div><div class="sous">Prénom : ........................................ Date : ........................</div>${exercices.join("")}</div>
    <div class="page corrige"><div class="titre">${escapeHtml(titre)} — corrigé</div>${corriges.join("")}</div>`, "nc");
}

export const STYLE_NOMBRES_CM = `
  .feuille.nc .nc-exo { margin: 0 0 6mm; page-break-inside: avoid; }
  .feuille.nc .nc-consigne { font-size: 13px; margin-bottom: 3mm; }
  .feuille.nc .nc-lignes > div { font-size: 15px; margin: 0 0 4mm; line-height: 1.7; }
  .feuille.nc .nc-grille { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4mm 8mm; font-size: 15px; }
  .feuille.nc .nc-grille > div { display: flex; align-items: center; gap: 2mm; flex-wrap: wrap; }
  .feuille.nc .nc-fr { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; line-height: 1.05; margin: 0 0.6mm; font-weight: 600; }
  .feuille.nc .nc-barre { display: block; width: 100%; min-width: 4mm; border-top: 1.6px solid #1c2233; margin: 0.4mm 0; }
  .feuille.nc .nc-case { display: inline-block; width: 12mm; height: 7mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; vertical-align: middle; }
  .feuille.nc .nc-case.nc-petite { width: 7mm; height: 5.5mm; }
  .feuille.nc .nc-case.nc-signe { width: 8mm; }
  .feuille.nc .nc-trait { display: inline-block; min-width: 80mm; border-bottom: 1px dotted #9aa0b4; vertical-align: bottom; height: 6mm; }
  .feuille.nc .nc-trait.nc-court { min-width: 45mm; }
  .feuille.nc .nc-aussi { color: #687087; font-size: 12px; }
  .feuille.nc .nc-tableau { border-collapse: collapse; width: 100%; font-size: 14px; }
  .feuille.nc .nc-tableau th, .feuille.nc .nc-tableau td { border: 1px solid #9aa0b4; text-align: center; padding: 1.5mm; height: 8mm; }
  .feuille.nc .nc-tableau th { background: #f0f2f8; font-size: 12px; }
  .feuille.nc .nc-droite { display: block; margin: 0 0 3mm; }
  .feuille.nc .nc-a-ranger { font-size: 15px; font-weight: 700; margin-bottom: 3mm; }
  .feuille.nc .nc-rangement { font-size: 15px; display: flex; align-items: center; gap: 2mm; flex-wrap: wrap; }
`;
