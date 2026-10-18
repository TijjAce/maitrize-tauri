// Les grandeurs et mesures du cours moyen, d'après le programme de
// mathématiques du cycle 3 (2025) et ses exemples de réussite (Éduscol, 2025).
//
// Les longueurs, les masses et les contenances avec toutes leurs unités, du
// millimètre au kilomètre, du milligramme à la tonne, du millilitre à
// l'hectolitre : les relations décimales entre deux unités successives, les
// écritures d'une même mesure — 3 cm + 4 mm = 34 mm = 3,4 cm ; ½ km = 500 m —,
// ranger des mesures données dans des unités différentes, les ajouter. Le
// périmètre, longueur du contour, sans formule pour le carré et le
// rectangle. Les aires : compter les carreaux et les demi-carreaux, encadrer,
// le centimètre carré ; au CM2, le décimètre et le mètre carrés, l'aire du
// rectangle. Les angles : aigu, droit, obtus, leurs notations, la comparaison
// sans mesure ; au CM2, le degré. Les durées : par étapes sur un axe, « sans
// algorithme posé en base soixante » ; au CM2, les secondes.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { choisir, entier, fr } from "./nombres";
import { escapeHtml } from "./print";

export type GrandeurCM = "longueur" | "masse" | "contenance";
export type ExerciceGrandeurs =
  | "convertir" | "ranger" | "calculer" | "unite" | "estimer"
  | "perimetre" | "perimetre-probleme"
  | "aire-pavage" | "aire-cm2" | "aire-encadrer" | "aire-perimetre" | "aire-rectangle" | "aire-convertir"
  | "angles-nature" | "angles-comparer" | "angles-nommer" | "angles-degres"
  | "durees" | "durees-problemes" | "durees-convertir" | "horloges-secondes";

export const EXERCICES_GRANDEURS: { id: ExerciceGrandeurs; libelle: string }[] = [
  { id: "convertir", libelle: "Les écritures d'une même mesure" },
  { id: "ranger", libelle: "Ranger des mesures données dans des unités différentes" },
  { id: "calculer", libelle: "Ajouter, soustraire des mesures d'unités différentes" },
  { id: "unite", libelle: "Choisir l'unité" },
  { id: "estimer", libelle: "Estimer : la mesure vraisemblable" },
  { id: "perimetre", libelle: "Le périmètre d'un polygone" },
  { id: "perimetre-probleme", libelle: "Des problèmes de périmètre" },
  { id: "aire-pavage", libelle: "L'aire en carreaux et demi-carreaux" },
  { id: "aire-cm2", libelle: "L'aire en centimètres carrés, sur un quadrillage de 1 cm" },
  { id: "aire-encadrer", libelle: "Encadrer une aire" },
  { id: "aire-perimetre", libelle: "Aire et périmètre, deux grandeurs" },
  { id: "aire-rectangle", libelle: "L'aire d'un rectangle (CM2)" },
  { id: "aire-convertir", libelle: "Les unités d'aire (CM2)" },
  { id: "angles-nature", libelle: "Aigu, droit ou obtus ?" },
  { id: "angles-comparer", libelle: "Comparer des angles" },
  { id: "angles-nommer", libelle: "Nommer un angle" },
  { id: "angles-degres", libelle: "Le degré : l'angle droit, sa moitié (CM2)" },
  { id: "durees", libelle: "La durée entre deux instants" },
  { id: "durees-problemes", libelle: "Des problèmes de durées" },
  { id: "durees-convertir", libelle: "Jours, heures, minutes, secondes (CM2)" },
  { id: "horloges-secondes", libelle: "Lire l'heure à la seconde (CM2)" },
];

export interface ReglagesGrandeursCM { classe: "CM1" | "CM2"; exercices: ExerciceGrandeurs[]; grandeur: GrandeurCM; combien: number; titre?: string }
export const REGLAGES_GRANDEURS_CM: ReglagesGrandeursCM = { classe: "CM1", exercices: ["convertir"], grandeur: "longueur", combien: 6 };

interface Bloc { consigne: string; corps: string; corrige: string }
type Alea = () => number;
const TROU = '<span class="gr-trou"></span>';
const lignes = (items: string[]) => `<div class="gr-lignes">${items.map((x) => `<div>${x}</div>`).join("")}</div>`;
const ECRIRE = (quoi: string) => `<div class="gr-ecrire">${quoi} : <span class="gr-trait"></span></div>`;
const frac = (n: number, d: number) => `<span class="gr-frac"><span>${n}</span><span>${d}</span></span>`;

/** Des prénoms inventés, avec leur pronom. */
const PRENOMS: [string, "il" | "elle"][] = [
  ["Léa", "elle"], ["Tom", "il"], ["Nour", "elle"], ["Basile", "il"], ["Zoé", "elle"], ["Malik", "il"], ["Maëlle", "elle"], ["Timéo", "il"],
  ["Lina", "elle"], ["Sacha", "il"], ["Jade", "elle"], ["Noé", "il"],
];
const quelquun = (alea: Alea) => { const p = choisir(alea, PRENOMS); return { nom: p[0], il: p[1], Il: p[1] === "il" ? "Il" : "Elle" }; };

// ── Les nombres décimaux exacts ───────────────────────────────────────────

/** m × 10^k écrit à la française, sans zéro inutile après la virgule. */
export function decimal(m: number, k: number): string {
  if (k >= 0) return fr(m * 10 ** k);
  const s = String(m).padStart(-k + 1, "0");
  const entiere = s.slice(0, s.length + k), decimales = s.slice(s.length + k).replace(/0+$/, "");
  return `${fr(Number(entiere))}${decimales ? `,${decimales}` : ""}`;
}
/** Le nombre de chiffres après la virgule de m × 10^k. */
const decimalesDe = (m: number, k: number) => (decimal(m, k).split(",")[1] ?? "").length;

// ── Les unités ────────────────────────────────────────────────────────────

/** Les unités de chaque grandeur, et leur puissance de dix par rapport au mètre, au gramme, au litre. */
const UNITES: Record<GrandeurCM, { u: string; e: number }[]> = {
  longueur: [{ u: "km", e: 3 }, { u: "hm", e: 2 }, { u: "dam", e: 1 }, { u: "m", e: 0 }, { u: "dm", e: -1 }, { u: "cm", e: -2 }, { u: "mm", e: -3 }],
  masse: [{ u: "t", e: 6 }, { u: "kg", e: 3 }, { u: "hg", e: 2 }, { u: "dag", e: 1 }, { u: "g", e: 0 }, { u: "dg", e: -1 }, { u: "cg", e: -2 }, { u: "mg", e: -3 }],
  contenance: [{ u: "hL", e: 2 }, { u: "daL", e: 1 }, { u: "L", e: 0 }, { u: "dL", e: -1 }, { u: "cL", e: -2 }, { u: "mL", e: -3 }],
};
const BASE: Record<GrandeurCM, string> = { longueur: "m", masse: "g", contenance: "L" };

/** Une mesure entière dans la plus petite unité (mm, mg, mL), écrite dans l'unité d'exposant e. */
const dans = (n: number, e: number) => decimal(n, -3 - e);

function convertir(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const unites = UNITES[r.grandeur];
  const items: [string, string][] = [];
  // Les écritures des exemples de réussite : une somme d'unités, une décomposition, une fraction d'unité.
  const composes: Record<GrandeurCM, () => [string, string]> = {
    longueur: () => { const a = entier(alea, 2, 9), b = entier(alea, 1, 9); return [`${a} cm + ${b} mm = ${TROU} mm = ${TROU} cm`, `${a} cm + ${b} mm = <b>${a}${b}</b> mm = <b>${a},${b}</b> cm`]; },
    masse: () => { const a = entier(alea, 2, 9), b = entier(alea, 1, 9); return [`${a} g + ${b} cg = ${TROU} cg = ${TROU} g`, `${a} g + ${b} cg = <b>${a}0${b}</b> cg = <b>${a},0${b}</b> g`]; },
    contenance: () => { const a = entier(alea, 2, 9), b = entier(alea, 1, 9); return [`${a} L + ${b} cL = ${TROU} cL = ${TROU} L`, `${a} L + ${b} cL = <b>${a}0${b}</b> cL = <b>${a},0${b}</b> L`]; },
  };
  const fractions: Record<GrandeurCM, [number, number, string, string, string][]> = {
    longueur: [[1, 2, "km", "m", "500"], [3, 4, "m", "cm", "75"], [1, 4, "km", "m", "250"], [1, 2, "m", "cm", "50"], [1, 10, "m", "cm", "10"]],
    masse: [[1, 2, "t", "kg", "500"], [1, 4, "kg", "g", "250"], [3, 4, "kg", "g", "750"], [1, 2, "kg", "g", "500"], [1, 10, "kg", "g", "100"]],
    contenance: [[1, 2, "L", "cL", "50"], [1, 4, "L", "cL", "25"], [3, 4, "L", "cL", "75"], [1, 2, "hL", "L", "50"], [1, 10, "L", "cL", "10"]],
  };
  items.push(composes[r.grandeur]());
  const [fn, fd, fu, fv, freponse] = choisir(alea, fractions[r.grandeur]);
  items.push([`${frac(fn, fd)} ${fu} = ${TROU} ${fv}`, `${frac(fn, fd)} ${fu} = <b>${freponse}</b> ${fv}`]);
  for (let garde = 0; items.length < Math.max(3, Math.min(10, r.combien)) && garde < 200; garde++) {
    const i = entier(alea, 0, unites.length - 1), j = entier(alea, 0, unites.length - 1);
    const ecart = Math.abs(unites[i].e - unites[j].e);
    if (i === j || ecart > 3) continue;
    const m = entier(alea, 2, 9999), k = -entier(alea, 0, 2);
    const k2 = k + unites[i].e - unites[j].e;
    if (decimalesDe(m, k) > 2 || decimalesDe(m, k2) > 3 || m * 10 ** Math.max(0, k2) > 999_999) continue;
    const texte = `${decimal(m, k)} ${unites[i].u} = `;
    if (items.some(([t]) => t.startsWith(texte))) continue;
    items.push([`${texte}${TROU} ${unites[j].u}`, `${texte}<b>${decimal(m, k2)}</b> ${unites[j].u}`]);
  }
  const ordre = melanger(alea, items.map((_, i) => i));
  return {
    consigne: "Complète. Pense aux unités de numération : 1 dizaine, c'est 10 unités, comme 1 dam, c'est 10 m.",
    corps: lignes(ordre.map((i) => items[i][0])), corrige: lignes(ordre.map((i) => items[i][1])),
  };
}

/** Des mesures voisines dans des unités différentes, comme 33 m ; 56,8 cm ; 0,2 km et 2,7 dam : deux ou trois chiffres significatifs. */
function mesuresMelangees(alea: Alea, grandeur: GrandeurCM, combien: number): { n: number; texte: string }[] {
  const unites = UNITES[grandeur];
  const [bas, haut] = grandeur === "longueur" ? [3, 6] : grandeur === "masse" ? [4, 9] : [2, 5];
  const ordre = entier(alea, bas, haut); // la puissance de dix des mesures, dans la plus petite unité
  const sortie: { n: number; texte: string }[] = [];
  for (let garde = 0; sortie.length < combien && garde < 600; garde++) {
    const chiffres = alea() < 0.6 ? entier(alea, 12, 99) : entier(alea, 101, 999);
    const q = ordre - String(chiffres).length + 1 + entier(alea, -1, 0);
    if (q < 0) continue;
    const n = chiffres * 10 ** q;
    const possibles = unites.filter((u) => {
      const v = n * 10 ** (-3 - u.e);
      return v >= 0.01 && v < 10000 && decimalesDe(n, -3 - u.e) <= 2 && !sortie.some((x) => x.texte.endsWith(` ${u.u}`));
    });
    if (!possibles.length || sortie.some((x) => x.n === n)) continue;
    const u = choisir(alea, possibles);
    sortie.push({ n, texte: `${dans(n, u.e)} ${u.u}` });
  }
  return sortie;
}

function ranger(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const series = Array.from({ length: Math.max(1, Math.min(4, Math.ceil(r.combien / 2))) }, () => mesuresMelangees(alea, r.grandeur, r.grandeur === "masse" ? 3 : 4));
  const base = BASE[r.grandeur], e = UNITES[r.grandeur].find((u) => u.u === base)!.e;
  return {
    consigne: `Range ces mesures dans l'ordre croissant. Écris-les d'abord toutes dans la même unité.`,
    corps: lignes(series.map((s) => `${s.map((x) => x.texte).join(" ; ")}${ECRIRE("Dans la même unité")}<div class="gr-rang">${s.map(() => TROU).join(" &lt; ")}</div>`)),
    corrige: lignes(series.map((s) => `${[...s].sort((a, b) => a.n - b.n).map((x) => `<b>${x.texte}</b> (${dans(x.n, e)} ${base})`).join(" &lt; ")}`)),
  };
}

function calculer(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const unites = UNITES[r.grandeur];
  const items: [string, string][] = [];
  // Les exemples de réussite : 8,2 m + 0,43 dam ; 8,2 kg + 840 g ; 1 L − 25 cL.
  for (let garde = 0; items.length < Math.max(2, Math.min(8, r.combien)) && garde < 300; garde++) {
    const i = entier(alea, 0, unites.length - 2), j = Math.min(unites.length - 1, i + entier(alea, 1, 2));
    const [ua, ub] = alea() < 0.5 ? [unites[i], unites[j]] : [unites[j], unites[i]];
    // Dans la plus petite unité (mm, mg, mL), des nombres qui s'écrivent avec peu de décimales dans la plus petite des deux unités.
    const pas = 10 ** Math.max(0, 1 + Math.min(ua.e, ub.e));
    const a = entier(alea, 11, 999) * pas * 10 ** entier(alea, 0, 1), b = entier(alea, 11, 999) * pas * 10 ** entier(alea, 0, 1);
    const moins = alea() < 0.4 && a > b;
    const total = moins ? a - b : a + b;
    const ea = dans(a, ua.e), eb = dans(b, ub.e), et = dans(total, ua.e);
    if ([ea, eb, et].some((x) => (x.split(",")[1] ?? "").length > 3 || x.replace(/\s| /g, "").split(",")[0].length > 5)) continue;
    items.push([`${ea} ${ua.u} ${moins ? "−" : "+"} ${eb} ${ub.u} = ${TROU} ${ua.u}`,
      `${ea} ${ua.u} ${moins ? "−" : "+"} ${eb} ${ub.u} = ${ea} ${ua.u} ${moins ? "−" : "+"} ${dans(b, ua.e)} ${ua.u} = <b>${et}</b> ${ua.u}`]);
  }
  return {
    consigne: "Calcule. Écris d'abord les deux mesures dans la même unité.",
    corps: lignes(items.map(([t]) => `${t}${ECRIRE("Dans la même unité")}`)), corrige: lignes(items.map(([, c]) => c)),
  };
}

/** Des objets familiers et l'unité qui leur convient : ce que l'élève se constitue comme références. */
const OBJETS_ET_UNITES: Record<GrandeurCM, [string, string, string[]][]> = {
  longueur: [
    ["La longueur d'une fourmi : 5", "mm", ["mm", "cm", "m"]], ["La hauteur d'une porte : 2", "m", ["cm", "m", "km"]],
    ["La distance de Paris à Marseille : 660", "km", ["m", "hm", "km"]], ["La longueur d'un crayon neuf : 17", "cm", ["mm", "cm", "dm"]],
    ["L'épaisseur d'une pièce de 1 € : 2", "mm", ["mm", "cm", "dm"]], ["La longueur d'une piscine olympique : 50", "m", ["cm", "m", "km"]],
    ["La longueur d'un terrain de football : 1", "hm", ["dam", "hm", "km"]], ["La largeur d'un cahier : 17", "cm", ["mm", "cm", "m"]],
  ],
  masse: [
    ["La masse d'un éléphant : 5", "t", ["kg", "t", "g"]], ["La masse d'une pomme : 150", "g", ["mg", "g", "kg"]],
    ["La masse d'un comprimé : 500", "mg", ["mg", "g", "kg"]], ["La masse d'un sac de pommes de terre : 5", "kg", ["g", "kg", "t"]],
    ["La masse d'une voiture : 1", "t", ["kg", "t", "g"]], ["La masse d'une feuille de papier : 5", "g", ["mg", "g", "kg"]],
    ["La masse d'un cartable plein : 4", "kg", ["g", "kg", "t"]], ["La masse d'un grain de riz : 25", "mg", ["mg", "g", "dg"]],
  ],
  contenance: [
    ["Une cuillère à café : 5", "mL", ["mL", "L", "hL"]], ["Une bouteille d'eau : 1,5", "L", ["mL", "cL", "L"]],
    ["Un verre : 20", "cL", ["mL", "cL", "L"]], ["Une baignoire : 2", "hL", ["L", "daL", "hL"]],
    ["Un arrosoir : 10", "L", ["mL", "L", "hL"]], ["Une canette : 33", "cL", ["mL", "cL", "L"]],
    ["Un seau : 1", "daL", ["cL", "L", "daL"]], ["Une goutte d'eau : 0,05", "mL", ["mL", "cL", "L"]],
  ],
};

function unite(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const items = melanger(alea, OBJETS_ET_UNITES[r.grandeur]).slice(0, Math.max(3, Math.min(8, r.combien)));
  return {
    consigne: "Choisis l'unité qui convient : entoure-la.",
    corps: lignes(items.map(([t, , o]) => `${escapeHtml(t)} … ${o.map((u) => `<span class="gr-choix">${u}</span>`).join(" ")}`)),
    corrige: lignes(items.map(([t, u]) => `${escapeHtml(t)} <b>${u}</b>`)),
  };
}

/** La mesure vraisemblable parmi trois, comme Paris – Lyon à vol d'oiseau : environ 400 km. */
const ESTIMATIONS: Record<GrandeurCM, [string, string[], number][]> = {
  longueur: [
    ["La distance de Paris à Lyon, à vol d'oiseau", ["40 km", "400 km", "4 000 km"], 1], ["La distance du nord au sud de l'Hexagone", ["100 km", "1 000 km", "10 000 km"], 1],
    ["La hauteur de la classe", ["30 cm", "3 m", "30 m"], 1], ["La longueur d'un autobus", ["1,2 m", "12 m", "120 m"], 1],
    ["La longueur d'un pas d'enfant", ["5 cm", "50 cm", "5 m"], 1], ["La hauteur de la tour Eiffel", ["30 m", "300 m", "3 km"], 1],
  ],
  masse: [
    ["Un litre d'eau", ["100 g", "1 kg", "10 kg"], 1], ["Un enfant de dix ans", ["3 kg", "30 kg", "300 kg"], 1],
    ["Une baguette de pain", ["25 g", "250 g", "2,5 kg"], 1], ["Une plaque de chocolat", ["10 g", "100 g", "1 kg"], 1],
    ["Un camion chargé", ["3 t", "30 t", "300 t"], 1], ["Un trombone", ["1 g", "10 g", "100 g"], 0],
  ],
  contenance: [
    ["Un verre", ["2 cL", "20 cL", "2 L"], 1], ["Une bouteille de lait", ["10 cL", "1 L", "10 L"], 1],
    ["Un arrosoir", ["1 dL", "10 L", "1 hL"], 1], ["Une baignoire pleine", ["15 L", "150 L", "1 500 L"], 1],
    ["Une cuillère à soupe", ["15 mL", "15 cL", "15 L"], 0], ["Un aquarium de classe", ["6 cL", "60 L", "6 hL"], 1],
  ],
};

function estimer(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const items = melanger(alea, ESTIMATIONS[r.grandeur]).slice(0, Math.max(3, Math.min(6, r.combien)));
  return {
    consigne: "Entoure la mesure vraisemblable. Aide-toi de mesures que tu connais.",
    corps: lignes(items.map(([t, o]) => `${escapeHtml(t)} : ${o.map((x) => `<span class="gr-choix">${x}</span>`).join(" ")}`)),
    corrige: lignes(items.map(([t, o, j]) => `${escapeHtml(t)} : <b>${o[j]}</b>`)),
  };
}

// ── Le périmètre ──────────────────────────────────────────────────────────

/** Un polygone dessiné à l'échelle de ses mesures — pas en vraie grandeur —, ses côtés étiquetés et codés. */
function polygoneSvg(points: [number, number][], etiquettes: string[], codes: number[] = [], anglesDroits: number[] = []): string {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const echelle = 60 / Math.max(maxX - minX, (maxY - minY) * 1.3, 1);
  const P = points.map(([x, y]) => [22 + (x - minX) * echelle, 10 + (maxY - y) * echelle] as [number, number]);
  const w = 44 + (maxX - minX) * echelle, h = 20 + (maxY - minY) * echelle;
  const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cy = P.reduce((s, p) => s + p[1], 0) / P.length;
  const cotes = P.map((p, i) => {
    const q = P[(i + 1) % P.length], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    const dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy) || 1;
    const lx = mx + (dx / d) * 4, ly = my + (dy / d) * 4 + 1.2;
    // L'étiquette s'écarte du côté : à droite d'un côté de droite, à gauche d'un côté de gauche.
    const ancre = dx / d > 0.45 ? "start" : dx / d < -0.45 ? "end" : "middle";
    // Les côtés de même longueur portent le même nombre de petits traits.
    const traits = Array.from({ length: codes[i] ?? 0 }, (_, t) => {
      const ux = (q[0] - p[0]) / Math.hypot(q[0] - p[0], q[1] - p[1]), uy = (q[1] - p[1]) / Math.hypot(q[0] - p[0], q[1] - p[1]);
      const ox = mx + ux * (t - ((codes[i] ?? 1) - 1) / 2) * 1.6, oy = my + uy * (t - ((codes[i] ?? 1) - 1) / 2) * 1.6;
      return `<line x1="${ox - uy * 1.6}" y1="${oy + ux * 1.6}" x2="${ox + uy * 1.6}" y2="${oy - ux * 1.6}" stroke="#1c2233" stroke-width="0.4"/>`;
    }).join("");
    return `${traits}${etiquettes[i] ? `<text x="${lx}" y="${ly}" font-size="3.4" text-anchor="${ancre}" fill="#1c2233">${escapeHtml(etiquettes[i])}</text>` : ""}`;
  }).join("");
  const droits = anglesDroits.map((i) => {
    const p = P[i], a = P[(i + P.length - 1) % P.length], b = P[(i + 1) % P.length];
    const u = [(a[0] - p[0]) / Math.hypot(a[0] - p[0], a[1] - p[1]), (a[1] - p[1]) / Math.hypot(a[0] - p[0], a[1] - p[1])];
    const v = [(b[0] - p[0]) / Math.hypot(b[0] - p[0], b[1] - p[1]), (b[1] - p[1]) / Math.hypot(b[0] - p[0], b[1] - p[1])];
    const s = 3;
    return `<polyline points="${p[0] + u[0] * s},${p[1] + u[1] * s} ${p[0] + (u[0] + v[0]) * s},${p[1] + (u[1] + v[1]) * s} ${p[0] + v[0] * s},${p[1] + v[1] * s}" fill="none" stroke="#1c2233" stroke-width="0.35"/>`;
  }).join("");
  return `<svg class="gr-figure" viewBox="0 0 ${w} ${h}" width="${w * 0.9}mm" height="${h * 0.9}mm"><polygon points="${P.map((p) => p.join(",")).join(" ")}" fill="#eef1fb" stroke="#1c2233" stroke-width="0.6"/>${cotes}${droits}</svg>`;
}

const cm = (dixiemes: number) => `${decimal(dixiemes, -1)} cm`;

function perimetre(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const sortes = melanger(alea, [0, 1, 2, 3]);
  const items = Array.from({ length: Math.max(2, Math.min(4, r.combien)) }, (_, i) => {
    switch (sortes[i % 4]) {
      case 0: {
        // Un triangle, ses trois côtés donnés.
        let a = 0, b = 0, c = 0;
        do { a = entier(alea, 25, 90); b = entier(alea, 25, 90); c = entier(alea, 25, 90); } while (a + b <= c + 8 || a + c <= b + 8 || b + c <= a + 8);
        const x = (b * b - a * a + c * c) / (2 * c), y = Math.sqrt(Math.max(0, b * b - x * x));
        return { svg: polygoneSvg([[0, 0], [c, 0], [x, y]], [cm(c), cm(a), cm(b)]), calcul: `${cm(c)} + ${cm(a)} + ${cm(b)} = ${cm(a + b + c)}` };
      }
      case 1: {
        // Un rectangle : deux côtés donnés, les autres codés — pas besoin de tout mesurer.
        const L = entier(alea, 40, 95), l = entier(alea, 15, L - 10);
        return { svg: polygoneSvg([[0, 0], [L, 0], [L, l], [0, l]], [cm(L), cm(l), "", ""], [1, 2, 1, 2], [0, 1, 2, 3]), calcul: `${cm(L)} + ${cm(l)} + ${cm(L)} + ${cm(l)} = ${cm(2 * (L + l))}` };
      }
      case 2: {
        const c = entier(alea, 20, 75);
        return { svg: polygoneSvg([[0, 0], [c, 0], [c, c], [0, c]], [cm(c), "", "", ""], [1, 1, 1, 1], [0, 1, 2, 3]), calcul: `${cm(c)} + ${cm(c)} + ${cm(c)} + ${cm(c)} = ${cm(4 * c)}` };
      }
      default: {
        // Une maison : un rectangle et un toit à deux pans égaux.
        const L = entier(alea, 40, 80), h = entier(alea, 25, 50), t = entier(alea, Math.ceil(L / 2) + 5, Math.ceil(L / 2) + 25);
        const toit = Math.sqrt(t * t - (L / 2) ** 2);
        return {
          svg: polygoneSvg([[0, 0], [L, 0], [L, h], [L / 2, h + toit], [0, h]], [cm(L), cm(h), cm(t), "", ""], [0, 1, 2, 2, 1], [0, 1]),
          calcul: `${cm(L)} + ${cm(h)} + ${cm(t)} + ${cm(t)} + ${cm(h)} = ${cm(L + 2 * h + 2 * t)}`,
        };
      }
    }
  });
  return {
    consigne: "Calcule le périmètre de chaque figure. Les figures ne sont pas en vraie grandeur ; les côtés qui portent les mêmes petits traits ont la même longueur.",
    corps: `<div class="gr-figures">${items.map((x) => `<div class="gr-case">${x.svg}<div>Périmètre : ${TROU} cm</div></div>`).join("")}</div>`,
    corrige: `<div class="gr-figures">${items.map((x) => `<div class="gr-case">${x.svg}<div><b>${x.calcul}</b></div></div>`).join("")}</div>`,
  };
}

function perimetreProbleme(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const items = Array.from({ length: Math.max(2, Math.min(5, r.combien)) }, (_, i) => {
    switch (i % 5) {
      case 0: {
        // Comme le rectangle ABCD du programme : AB = 8 cm, périmètre 27 cm.
        const L = entier(alea, 5, 9), l10 = entier(alea, 15, 10 * L - 5), P10 = 2 * (10 * L + l10);
        return { texte: `Un rectangle ABCD a un côté [AB] de ${L} cm et un périmètre de ${decimal(P10, -1)} cm. Quelle est la longueur du côté [BC] ? Construis ce rectangle.`,
          calcul: `${decimal(P10, -1)} − ${L} − ${L} = ${decimal(2 * l10, -1)} ; ${decimal(2 * l10, -1)} ÷ 2 = ${decimal(l10, -1)} cm` };
      }
      case 1: {
        const c = entier(alea, 3, 15);
        return { texte: `Un carré a un périmètre de ${4 * c} cm. Quelle est la longueur de son côté ?`, calcul: `${4 * c} ÷ 4 = ${c} cm` };
      }
      case 2: {
        const L = entier(alea, 12, 40), l = entier(alea, 6, L - 3), porte = entier(alea, 1, 3);
        return { texte: `Un enclos rectangulaire mesure ${L} m sur ${l} m. On l'entoure de grillage, sauf une porte de ${porte} m. Quelle longueur de grillage faut-il ?`,
          calcul: `${L} + ${l} + ${L} + ${l} = ${2 * (L + l)} ; ${2 * (L + l)} − ${porte} = ${2 * (L + l) - porte} m` };
      }
      case 3: {
        const L = entier(alea, 5, 12), l = entier(alea, 2, L - 1);
        if ((L + l) % 2) return { texte: `Un triangle équilatéral a des côtés de ${L} cm. Quel est son périmètre ?`, calcul: `${L} + ${L} + ${L} = ${3 * L} cm` };
        return { texte: `Un carré a le même périmètre qu'un rectangle de ${L} cm sur ${l} cm. Quelle est la longueur du côté du carré ?`,
          calcul: `${L} + ${l} + ${L} + ${l} = ${2 * (L + l)} ; ${2 * (L + l)} ÷ 4 = ${(L + l) / 2} cm` };
      }
      default: {
        const tour = choisir(alea, [200, 250, 300, 400]), tours = entier(alea, 3, 8);
        const p = quelquun(alea);
        return { texte: `Le tour du stade mesure ${tour} m. ${p.nom} en fait ${tours}. Quelle distance parcourt-${p.il}, en mètres, puis en kilomètres ?`,
          calcul: `${tours} × ${tour} = ${fr(tours * tour)} m = ${decimal(tours * tour, -3)} km` };
      }
    }
  });
  return {
    consigne: "Résous ces problèmes. Fais un dessin à main levée, et écris tes calculs.",
    corps: lignes(items.map((x) => `${escapeHtml(x.texte)}<div class="gr-cadre"></div>`)),
    corrige: lignes(items.map((x) => `${escapeHtml(x.texte)} <b>${escapeHtml(x.calcul)}</b>`)),
  };
}

// ── Les aires ─────────────────────────────────────────────────────────────

const C = 5; // millimètres par carreau

/** Une figure faite de carreaux entiers et de demi-carreaux, sur un quadrillage. */
function figureEnCarreaux(alea: Alea, largeur: number, hauteur: number, demis: number, C = 5): { svg: string; aire: number } {
  const pleins = new Set<string>();
  const cle = (x: number, y: number) => `${x},${y}`;
  pleins.add(cle(Math.floor(largeur / 2), Math.floor(hauteur / 2)));
  const cible = entier(alea, Math.floor(largeur * hauteur * 0.3), Math.floor(largeur * hauteur * 0.55));
  for (let garde = 0; pleins.size < cible && garde < 2000; garde++) {
    const [x, y] = choisir(alea, [...pleins]).split(",").map(Number);
    const [dx, dy] = choisir(alea, [[1, 0], [-1, 0], [0, 1], [0, -1]] as const);
    const nx = x + dx, ny = y + dy;
    if (nx >= 1 && ny >= 1 && nx < largeur - 1 && ny < hauteur - 1) pleins.add(cle(nx, ny));
  }
  // Les demi-carreaux : un triangle dans une case voisine, le long d'un côté de la figure.
  const triangles: string[] = [];
  const pris = new Set<string>();
  for (let garde = 0; triangles.length < demis && garde < 500; garde++) {
    const [x, y] = choisir(alea, [...pleins]).split(",").map(Number);
    const [dx, dy] = choisir(alea, [[1, 0], [-1, 0], [0, 1], [0, -1]] as const);
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= largeur || ny >= hauteur || pleins.has(cle(nx, ny)) || pris.has(cle(nx, ny))) continue;
    pris.add(cle(nx, ny));
    const x0 = nx * C, y0 = ny * C, x1 = x0 + C, y1 = y0 + C;
    // Le triangle garde le côté commun avec la figure.
    const pts = dx === 1 ? (alea() < 0.5 ? [[x0, y0], [x0, y1], [x1, y1]] : [[x0, y0], [x0, y1], [x1, y0]])
      : dx === -1 ? (alea() < 0.5 ? [[x1, y0], [x1, y1], [x0, y1]] : [[x1, y0], [x1, y1], [x0, y0]])
        : dy === 1 ? (alea() < 0.5 ? [[x0, y0], [x1, y0], [x1, y1]] : [[x0, y0], [x1, y0], [x0, y1]])
          : (alea() < 0.5 ? [[x0, y1], [x1, y1], [x1, y0]] : [[x0, y1], [x1, y1], [x0, y0]]);
    triangles.push(`<polygon points="${pts.map((p) => p.join(",")).join(" ")}" fill="#c7d2fe" stroke="#1c2233" stroke-width="0.25"/>`);
  }
  const grille = quadrillage(largeur, hauteur, C);
  const cases = [...pleins].map((k) => { const [x, y] = k.split(",").map(Number); return `<rect x="${x * C}" y="${y * C}" width="${C}" height="${C}" fill="#c7d2fe" stroke="#1c2233" stroke-width="0.25"/>`; }).join("");
  return { svg: `<svg class="gr-quadrillage" viewBox="-0.5 -0.5 ${largeur * C + 1} ${hauteur * C + 1}" width="${largeur * C + 1}mm" height="${hauteur * C + 1}mm">${grille}${cases}${triangles.join("")}</svg>`, aire: pleins.size + triangles.length / 2 };
}

function quadrillage(largeur: number, hauteur: number, C = 5): string {
  return Array.from({ length: largeur + 1 }, (_, i) => `<line x1="${i * C}" y1="0" x2="${i * C}" y2="${hauteur * C}" stroke="#c4c9d6" stroke-width="0.2"/>`).join("")
    + Array.from({ length: hauteur + 1 }, (_, j) => `<line x1="0" y1="${j * C}" x2="${largeur * C}" y2="${j * C}" stroke="#c4c9d6" stroke-width="0.2"/>`).join("");
}

const carreaux = (aire: number) => `${decimal(Math.round(aire * 10), -1)} carreau${aire >= 2 ? "x" : ""}`;

function airePavage(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const items = Array.from({ length: Math.max(2, Math.min(4, r.combien)) }, () => figureEnCarreaux(alea, 9, 7, entier(alea, 2, 5)));
  return {
    consigne: "Quelle est l'aire de chaque figure, en carreaux ? Compte les carreaux entiers, puis les demi-carreaux : deux demi-carreaux font un carreau.",
    corps: `<div class="gr-figures">${items.map((x) => `<div class="gr-case">${x.svg}<div>Aire : ${TROU} carreaux</div></div>`).join("")}</div>`,
    corrige: `<div class="gr-figures">${items.map((x) => `<div class="gr-case">${x.svg}<div><b>${carreaux(x.aire)}</b></div></div>`).join("")}</div>`,
  };
}

/** Le centimètre carré, en vraie grandeur : 1 cm² est l'aire d'un carré de 1 cm de côté. */
function aireCm2(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const items = Array.from({ length: Math.max(1, Math.min(2, Math.ceil(r.combien / 2))) }, () => figureEnCarreaux(alea, 8, 6, entier(alea, 2, 4), 10));
  return {
    consigne: "Chaque carreau est un carré de 1 cm de côté : son aire est 1 cm². Quelle est l'aire de chaque figure ?",
    corps: `<div class="gr-figures">${items.map((x) => `<div class="gr-case">${x.svg}<div>Aire : ${TROU} cm²</div></div>`).join("")}</div>`,
    corrige: `<div class="gr-figures">${items.map((x) => `<div class="gr-case">${x.svg}<div><b>${decimal(Math.round(x.aire * 10), -1)} cm²</b></div></div>`).join("")}</div>`,
  };
}

/** Un disque sur le quadrillage : les carreaux entiers dedans, et ceux qu'il faut pour le recouvrir. */
function aireEncadrer(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const items = Array.from({ length: Math.max(1, Math.min(2, Math.ceil(r.combien / 3))) }, () => {
    const n = 10, rayon = entier(alea, 28, 42) / 10, cx = n / 2 + (alea() - 0.5) * 0.6, cy = n / 2 + (alea() - 0.5) * 0.6;
    let dedans = 0, touches = 0;
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) {
      const coins = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
      if (coins.every(([a, b]) => Math.hypot(a - cx, b - cy) <= rayon)) dedans++;
      const px = Math.max(x, Math.min(cx, x + 1)), py = Math.max(y, Math.min(cy, y + 1));
      if (Math.hypot(px - cx, py - cy) < rayon) touches++;
    }
    const svg = `<svg class="gr-quadrillage" viewBox="-0.5 -0.5 ${n * C + 1} ${n * C + 1}" width="${n * C + 1}mm" height="${n * C + 1}mm">${quadrillage(n, n)}`
      + `<circle cx="${cx * C}" cy="${cy * C}" r="${rayon * C}" fill="#c7d2fe" fill-opacity="0.7" stroke="#1c2233" stroke-width="0.4"/></svg>`;
    return { svg, dedans, touches };
  });
  return {
    consigne: "Encadre l'aire de la figure : compte les carreaux entiers qui sont dedans, puis tous les carreaux qu'il faut pour la recouvrir.",
    corps: `<div class="gr-figures">${items.map((x) => `<div class="gr-case">${x.svg}<div>L'aire est comprise entre ${TROU} carreaux et ${TROU} carreaux.</div></div>`).join("")}</div>`,
    corrige: `<div class="gr-figures">${items.map((x) => `<div class="gr-case">${x.svg}<div>Entre <b>${x.dedans}</b> carreaux et <b>${x.touches}</b> carreaux.</div></div>`).join("")}</div>`,
  };
}

/** Deux rectangles de même aire et de périmètres différents, ou l'inverse : aire et périmètre sont deux grandeurs. */
function airePerimetre(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const paires = Array.from({ length: Math.max(1, Math.min(2, Math.ceil(r.combien / 3))) }, () => {
    const memeAire = alea() < 0.5;
    const choix = memeAire
      ? choisir(alea, [[[6, 2], [4, 3]], [[8, 2], [4, 4]], [[6, 4], [8, 3]], [[9, 2], [6, 3]], [[12, 1], [4, 3]]] as const)
      : choisir(alea, [[[5, 3], [6, 2]], [[6, 3], [7, 2]], [[5, 5], [8, 2]], [[4, 4], [6, 2]]] as const);
    return choix.map(([L, l]) => ({ L, l }));
  });
  const dessin = (L: number, l: number) => `<svg class="gr-quadrillage" viewBox="-0.5 -0.5 ${(L + 2) * C + 1} ${(l + 2) * C + 1}" width="${(L + 2) * C + 1}mm" height="${(l + 2) * C + 1}mm">${quadrillage(L + 2, l + 2)}`
    + `<rect x="${C}" y="${C}" width="${L * C}" height="${l * C}" fill="#c7d2fe" fill-opacity="0.8" stroke="#1c2233" stroke-width="0.4"/></svg>`;
  const unePaire = (p: { L: number; l: number }[], corrige: boolean) => `<div class="gr-figures">${p.map(({ L, l }, i) => `<div class="gr-case">${dessin(L, l)}<div><b>Figure ${i === 0 ? "A" : "B"}</b></div>`
    + `<div>Aire : ${corrige ? `<b>${L * l} carreaux</b>` : `${TROU} carreaux`}</div><div>Périmètre : ${corrige ? `<b>${2 * (L + l)} côtés de carreau</b>` : `${TROU} côtés de carreau`}</div></div>`).join("")}</div>`
    + (corrige ? `<div>${p[0].L * p[0].l === p[1].L * p[1].l ? "Même aire, mais des périmètres différents." : "Même périmètre, mais des aires différentes."}</div>` : `<div>Que remarques-tu ? <span class="gr-trait"></span></div>`);
  return {
    consigne: "Pour chaque figure, trouve l'aire en carreaux et le périmètre en côtés de carreau. Compare.",
    corps: paires.map((p) => unePaire(p, false)).join(""), corrige: paires.map((p) => unePaire(p, true)).join(""),
  };
}

function aireRectangle(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const items = Array.from({ length: Math.max(2, Math.min(4, r.combien)) }, () => ({ L: entier(alea, 3, 8), l: entier(alea, 2, 5) }));
  // En vraie grandeur, sur un quadrillage de 1 cm : on vérifie l'aire par le pavage en carrés de 1 cm de côté.
  const dessin = (L: number, l: number, avecGrille: boolean) => `<svg viewBox="-0.5 -0.5 ${L * 10 + 1} ${l * 10 + 1}" width="${L * 10 + 1}mm" height="${l * 10 + 1}mm">`
    + (avecGrille ? Array.from({ length: L + 1 }, (_, i) => `<line x1="${i * 10}" y1="0" x2="${i * 10}" y2="${l * 10}" stroke="#9aa0b4" stroke-width="0.2"/>`).join("")
      + Array.from({ length: l + 1 }, (_, j) => `<line x1="0" y1="${j * 10}" x2="${L * 10}" y2="${j * 10}" stroke="#9aa0b4" stroke-width="0.2"/>`).join("") : "")
    + `<rect x="0" y="0" width="${L * 10}" height="${l * 10}" fill="none" stroke="#1c2233" stroke-width="0.5"/></svg>`;
  return {
    consigne: "Mesure les côtés de chaque rectangle, puis trouve son aire en cm². Tu peux tracer les carrés de 1 cm de côté pour vérifier.",
    corps: `<div class="gr-figures">${items.map(({ L, l }) => `<div class="gr-case">${dessin(L, l, false)}<div>Aire : ${TROU} cm²</div></div>`).join("")}</div>`,
    corrige: `<div class="gr-figures">${items.map(({ L, l }) => `<div class="gr-case">${dessin(L, l, true)}<div><b>${l} rangées de ${L} carrés : ${l} × ${L} = ${L * l} cm²</b></div></div>`).join("")}</div>`,
  };
}

function aireConvertir(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const unites = [{ u: "m²", e: 0 }, { u: "dm²", e: -2 }, { u: "cm²", e: -4 }];
  const items: [string, string][] = [["1 m² = " + TROU + " dm²", "1 m² = <b>100</b> dm²"], ["1 dm² = " + TROU + " cm²", "1 dm² = <b>100</b> cm²"]];
  for (let garde = 0; items.length < Math.max(3, Math.min(8, r.combien)) && garde < 200; garde++) {
    const [a, b] = melanger(alea, unites).slice(0, 2);
    const m = entier(alea, 2, 999), k = -entier(alea, 0, 2), k2 = k + a.e - b.e;
    if (decimalesDe(m, k) > 2 || decimalesDe(m, k2) > 4 || m * 10 ** Math.max(0, k2) > 9_999_999) continue;
    const texte = `${decimal(m, k)} ${a.u} = `;
    if (items.some(([t]) => t.startsWith(texte))) continue;
    items.push([`${texte}${TROU} ${b.u}`, `${texte}<b>${decimal(m, k2)}</b> ${b.u}`]);
  }
  return {
    consigne: "Complète. Un carré de 1 dm de côté se découpe en 100 carrés de 1 cm de côté : 1 dm² = 100 cm².",
    corps: lignes(items.map(([t]) => t)), corrige: lignes(items.map(([, c]) => c)),
  };
}

// ── Les angles ────────────────────────────────────────────────────────────

/** Un angle : son sommet, l'orientation de son premier côté, son ouverture en degrés, et la longueur de ses côtés. */
function angleSvg(ouverture: number, orientation: number, cotes: [number, number], noms?: [string, string, string], arc = true): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  const sx = 25, sy = 25;
  const a = [sx + cotes[0] * Math.cos(rad(orientation)), sy - cotes[0] * Math.sin(rad(orientation))];
  const b = [sx + cotes[1] * Math.cos(rad(orientation + ouverture)), sy - cotes[1] * Math.sin(rad(orientation + ouverture))];
  const r = 6, a1 = [sx + r * Math.cos(rad(orientation)), sy - r * Math.sin(rad(orientation))], b1 = [sx + r * Math.cos(rad(orientation + ouverture)), sy - r * Math.sin(rad(orientation + ouverture))];
  const marque = !arc ? "" : Math.abs(ouverture - 90) < 0.5
    ? (() => { const u = [Math.cos(rad(orientation)), -Math.sin(rad(orientation))], v = [Math.cos(rad(orientation + 90)), -Math.sin(rad(orientation + 90))], s = 4;
      return `<polyline points="${sx + u[0] * s},${sy + u[1] * s} ${sx + (u[0] + v[0]) * s},${sy + (u[1] + v[1]) * s} ${sx + v[0] * s},${sy + v[1] * s}" fill="none" stroke="#d94033" stroke-width="0.5"/>`; })()
    : `<path d="M ${a1[0]} ${a1[1]} A ${r} ${r} 0 ${ouverture > 180 ? 1 : 0} 0 ${b1[0]} ${b1[1]}" fill="none" stroke="#d94033" stroke-width="0.5"/>`;
  const nom = (p: number[], t: string, dx = 0) => `<text x="${p[0] + dx}" y="${p[1] - 1.5}" font-size="3.6" font-style="italic" text-anchor="middle" fill="#1c2233">${t}</text>`;
  return `<svg class="gr-angle" viewBox="0 0 50 50" width="34mm" height="34mm"><line x1="${sx}" y1="${sy}" x2="${a[0]}" y2="${a[1]}" stroke="#1c2233" stroke-width="0.6"/>`
    + `<line x1="${sx}" y1="${sy}" x2="${b[0]}" y2="${b[1]}" stroke="#1c2233" stroke-width="0.6"/>${marque}`
    + (noms ? nom(a, noms[0]) + nom([sx - 5 * Math.cos(rad(orientation + ouverture / 2)), sy + 5 * Math.sin(rad(orientation + ouverture / 2)) + 2.5], noms[1]) + nom(b, noms[2]) : "") + "</svg>";
}

function anglesNature(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const items = Array.from({ length: Math.max(3, Math.min(6, r.combien)) }, (_, i) => {
    const nature = ["aigu", "droit", "obtus"][(i + entier(alea, 0, 2)) % 3];
    // Pas d'angle douteux : loin de l'angle droit, sauf l'angle droit lui-même.
    const ouverture = nature === "droit" ? 90 : nature === "aigu" ? entier(alea, 25, 70) : entier(alea, 110, 160);
    return { svg: angleSvg(ouverture, entier(alea, 0, 359), [entier(alea, 14, 22), entier(alea, 14, 22)]), nature };
  });
  return {
    consigne: "Cet angle est-il aigu, droit ou obtus ? Vérifie avec ton équerre.",
    corps: `<div class="gr-figures">${items.map((x) => `<div class="gr-case">${x.svg}<div>${["aigu", "droit", "obtus"].map((n) => `<span class="gr-choix">${n}</span>`).join(" ")}</div></div>`).join("")}</div>`,
    corrige: `<div class="gr-figures">${items.map((x) => `<div class="gr-case">${x.svg}<div><b>${x.nature}</b></div></div>`).join("")}</div>`,
  };
}

function anglesComparer(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const paires = Array.from({ length: Math.max(2, Math.min(4, Math.ceil(r.combien / 2))) }, () => {
    const a = entier(alea, 25, 150);
    let b = entier(alea, 25, 150);
    while (Math.abs(a - b) < 12) b = entier(alea, 25, 150);
    // Le plus petit angle a les côtés les plus longs : la longueur des côtés ne compte pas.
    const [ca, cb]: [number, number][] = a < b ? [[22, 22], [12, 12]] : [[12, 12], [22, 22]];
    return { svgA: angleSvg(a, entier(alea, 0, 359), ca), svgB: angleSvg(b, entier(alea, 0, 359), cb), plusGrand: a > b ? "A" : "B" };
  });
  return {
    consigne: "Quel angle est le plus grand, A ou B ? Fabrique un gabarit de l'un sur du papier calque pour comparer. Attention : la longueur des côtés ne compte pas.",
    corps: paires.map((p) => `<div class="gr-figures"><div class="gr-case">${p.svgA}<div>Angle A</div></div><div class="gr-case">${p.svgB}<div>Angle B</div></div><div class="gr-case gr-reponse">Le plus grand : ${TROU}</div></div>`).join(""),
    corrige: paires.map((p) => `<div class="gr-figures"><div class="gr-case">${p.svgA}<div>Angle A</div></div><div class="gr-case">${p.svgB}<div>Angle B</div></div><div class="gr-case gr-reponse">Le plus grand : <b>${p.plusGrand}</b></div></div>`).join(""),
  };
}

function anglesNommer(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const lettres = melanger(alea, ["A", "B", "C", "D", "E", "F", "M", "N", "P", "R", "S", "T"]);
  const items = Array.from({ length: Math.max(2, Math.min(4, Math.ceil(r.combien / 2))) }, (_, i) => {
    const [p, s, q] = lettres.slice(i * 3, i * 3 + 3);
    return { svg: angleSvg(entier(alea, 35, 140), entier(alea, 0, 359), [20, 20], [p, s, q]), p, s, q };
  });
  const chapeau = (t: string) => `<span class="gr-chapeau">${t}</span>`;
  return {
    consigne: "Pour chaque angle marqué, écris son nom avec trois lettres, son sommet et ses deux côtés.",
    corps: `<div class="gr-figures">${items.map((x) => `<div class="gr-case">${x.svg}<div>L'angle ${TROU} ; sommet : ${TROU}</div><div>Côtés : ${TROU} et ${TROU}</div></div>`).join("")}</div>`,
    corrige: `<div class="gr-figures">${items.map((x) => `<div class="gr-case">${x.svg}<div>L'angle <b>${chapeau(x.p + x.s + x.q)}</b> (ou ${chapeau(x.q + x.s + x.p)}) ; sommet : <b>${x.s}</b> ; côtés : <b>[${x.s}${x.p})</b> et <b>[${x.s}${x.q})</b></div></div>`).join("")}</div>`,
  };
}

function anglesDegres(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const questions: [string, string][] = melanger(alea, [
    ["Un angle droit mesure", "90°"], ["La moitié d'un angle droit, obtenue par pliage, mesure", "45°"],
    ["Deux angles droits côte à côte forment un angle de", "180°"], ["Un angle trois fois plus grand que la moitié d'un angle droit mesure", "135°"],
    ["Le robot tourne vers la gauche d'un angle droit : il tourne de", "90°"], ["Le lutin fait un quart de tour : il tourne de", "90°"],
    ["Un angle deux fois plus grand qu'un angle de 30° mesure", "60°"], ["Un angle égal à la somme d'un angle de 45° et d'un angle de 30° mesure", "75°"],
  ] as [string, string][]).slice(0, Math.max(3, Math.min(8, r.combien)));
  return {
    consigne: "Complète. L'unité de mesure des angles est le degré : l'angle droit mesure 90°.",
    corps: lignes(questions.map(([q]) => `${escapeHtml(q)} ${TROU}`)), corrige: lignes(questions.map(([q, rep]) => `${escapeHtml(q)} <b>${rep}</b>`)),
  };
}

// ── Les durées ────────────────────────────────────────────────────────────

/** Un instant ou une durée, en secondes ; écrit « 8 h 52 min » ou « 8 h 52 min 27 s ». */
export function ecrireDuree(s: number, secondes: boolean, instant = false): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const avecSecondes = secondes && sec > 0;
  const parts = [instant || h ? `${h} h` : "", m || (instant && avecSecondes) ? `${m} min` : "", avecSecondes ? `${sec} s` : ""].filter(Boolean);
  return parts.join(" ") || "0 min";
}

/** Le calcul d'une durée par étapes, sur l'axe du temps : jusqu'à la minute ronde, l'heure ronde, puis l'heure d'arrivée. */
export function dureeParEtapes(debut: number, fin: number, secondes: boolean): string {
  const etapes: [number, number][] = [];
  let t = debut;
  if (secondes && t % 60 && fin - t >= 60 - (t % 60)) { const u = t + 60 - (t % 60); etapes.push([t, u]); t = u; }
  if (t % 3600 && fin - t >= 3600 - (t % 3600)) { const u = t + 3600 - (t % 3600); etapes.push([t, u]); t = u; }
  const heures = Math.floor((fin - t) / 3600) * 3600;
  if (heures) { etapes.push([t, t + heures]); t += heures; }
  const minutes = Math.floor((fin - t) / 60) * 60;
  if (minutes) { etapes.push([t, t + minutes]); t += minutes; }
  if (fin > t) etapes.push([t, fin]);
  return `${etapes.map(([a, b]) => `${ecrireDuree(a, secondes, true)} → ${ecrireDuree(b, secondes, true)} : ${ecrireDuree(b - a, secondes)}`).join(" ; ")}. En tout : ${ecrireDuree(fin - debut, secondes)}`;
}

function durees(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const secondes = r.classe === "CM2";
  const items = Array.from({ length: Math.max(2, Math.min(6, r.combien)) }, () => {
    const debut = entier(alea, 6 * 3600, 15 * 3600) - (secondes ? 0 : 0), d = entier(alea, 15 * 60, 4 * 3600);
    const a = secondes ? debut : debut - (debut % 60), b = secondes ? a + d : a + d - (d % 60);
    return { a, b };
  });
  return {
    consigne: "Quelle durée s'écoule entre ces deux instants ? Avance par étapes sur l'axe du temps : jusqu'à l'heure ronde, puis d'heure en heure.",
    corps: lignes(items.map(({ a, b }) => `De ${ecrireDuree(a, secondes, true)} à ${ecrireDuree(b, secondes, true)} : ${TROU}`)),
    corrige: lignes(items.map(({ a, b }) => `De ${ecrireDuree(a, secondes, true)} à ${ecrireDuree(b, secondes, true)} : <b>${dureeParEtapes(a, b, secondes)}</b>`)),
  };
}

function dureesProblemes(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const secondes = r.classe === "CM2";
  const arrondi = (t: number) => (secondes ? t : t - (t % 60));
  const items = Array.from({ length: Math.max(2, Math.min(4, r.combien)) }, (_, i) => {
    const p = quelquun(alea);
    switch (i % (secondes ? 4 : 3)) {
      case 0: {
        if (secondes) {
          // Comme le marathon du programme de CM2 : le départ et l'arrivée, à la seconde.
          const a = entier(alea, 8 * 3600, 9 * 3600), b = a + entier(alea, 3 * 3600, 5 * 3600);
          return { texte: `Lors d'un marathon, ${p.nom} est parti${p.il === "elle" ? "e" : ""} à ${ecrireDuree(a, true, true)}. ${p.Il} a franchi la ligne d'arrivée à ${ecrireDuree(b, true, true)}. Combien de temps a duré sa course ?`,
            calcul: dureeParEtapes(a, b, true) };
        }
        // Comme le trajet du programme de CM1 : 7 h 47 min, puis 8 h 16 min.
        const a = arrondi(entier(alea, 6 * 3600, 9 * 3600)), b = arrondi(a + entier(alea, 12 * 60, 95 * 60));
        return { texte: `${p.nom} est sorti${p.il === "elle" ? "e" : ""} de chez ${p.il === "il" ? "lui" : "elle"} à ${ecrireDuree(a, false, true)} et est arrivé${p.il === "elle" ? "e" : ""} à l'école à ${ecrireDuree(b, false, true)}. Combien de temps a duré son trajet ?`,
          calcul: dureeParEtapes(a, b, false) };
      }
      case 1: {
        // Comme l'étape cyclable : la durée et l'heure d'arrivée ; à quelle heure est-on parti ?
        const d = arrondi(entier(alea, 45 * 60, 2 * 3600)), b = arrondi(entier(alea, 11 * 3600, 13 * 3600)), a = b - d;
        return { texte: `${p.nom} a mis ${ecrireDuree(d, secondes)} pour parcourir une étape d'une course cycliste. ${p.Il} a franchi la ligne d'arrivée à ${ecrireDuree(b, secondes, true)}. À quelle heure est-${p.il} parti${p.il === "elle" ? "e" : ""} ?`,
          calcul: `On recule de ${ecrireDuree(d, secondes)} à partir de ${ecrireDuree(b, secondes, true)} : ${p.il === "il" ? "il" : "elle"} est parti${p.il === "elle" ? "e" : ""} à ${ecrireDuree(a, secondes, true)}` };
      }
      case 2: {
        // Comme le train : un départ, une première durée, puis une seconde ; à la minute, comme un horaire.
        const minute = (t: number) => t - (t % 60);
        const a = minute(entier(alea, 6 * 3600, 9 * 3600)), d1 = minute(entier(alea, 50 * 60, 2 * 3600)), d2 = minute(entier(alea, 20 * 60, 59 * 60));
        return { texte: `Le train est parti à ${ecrireDuree(a, false, true)}. Il a mis ${ecrireDuree(d1, false)} pour arriver à la première gare, et il est arrivé à la deuxième gare ${ecrireDuree(d2, false)} plus tard. À quelle heure est-il arrivé à la deuxième gare ?`,
          calcul: `${ecrireDuree(a, false, true)} + ${ecrireDuree(d1, false)} = ${ecrireDuree(a + d1, false, true)} ; ${ecrireDuree(a + d1, false, true)} + ${ecrireDuree(d2, false)} = ${ecrireDuree(a + d1 + d2, false, true)}` };
      }
      default: {
        // Comme le triathlon du programme : la durée qui manque.
        const depart = entier(alea, 7 * 3600, 8 * 3600), nage = entier(alea, 25 * 60, 45 * 60), velo = entier(alea, 70 * 60, 100 * 60), transitions = entier(alea, 5 * 60, 12 * 60), course = entier(alea, 40 * 60, 70 * 60);
        const arrivee = depart + nage + velo + transitions + course;
        return { texte: `${p.nom} s'élance à ${ecrireDuree(depart, true, true)} pour un triathlon. ${p.Il} met ${ecrireDuree(nage, true)} pour la natation, ${ecrireDuree(velo, true)} pour le vélo et ${ecrireDuree(transitions, true)} pour les transitions. ${p.Il} franchit la ligne d'arrivée à ${ecrireDuree(arrivee, true, true)}. Combien de temps a duré sa course à pied ?`,
          calcul: `Le triathlon a duré ${ecrireDuree(arrivee - depart, true)} ; ${ecrireDuree(nage, true)} + ${ecrireDuree(velo, true)} + ${ecrireDuree(transitions, true)} = ${ecrireDuree(nage + velo + transitions, true)} ; la course à pied : ${ecrireDuree(course, true)}` };
      }
    }
  });
  return {
    consigne: "Résous ces problèmes. Trace un axe du temps et avance par étapes ; tu calcules de tête.",
    corps: lignes(items.map((x) => `${escapeHtml(x.texte)}<div class="gr-cadre"></div>`)),
    corrige: lignes(items.map((x) => `${escapeHtml(x.texte)} <b>${escapeHtml(x.calcul)}</b>`)),
  };
}

function dureesConvertir(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const h = entier(alea, 2, 4), m = entier(alea, 5, 55), m2 = entier(alea, 2, 9), s2 = entier(alea, 5, 55), s3 = entier(alea, 130, 590), m4 = entier(alea, 70, 200), j = entier(alea, 2, 3);
  const items: [string, string][] = melanger(alea, [
    [`${h} h ${m} min = ${TROU} s`, `${h} h ${m} min = ${h * 60 + m} min = <b>${fr((h * 60 + m) * 60)}</b> s`],
    [`${m2} min ${s2} s = ${TROU} s`, `${m2} min ${s2} s = ${m2 * 60} s + ${s2} s = <b>${m2 * 60 + s2}</b> s`],
    [`${s3} s = ${TROU} min ${TROU} s`, `${s3} s = <b>${Math.floor(s3 / 60)}</b> min <b>${s3 % 60}</b> s`],
    [`${m4} min = ${TROU} h ${TROU} min`, `${m4} min = <b>${Math.floor(m4 / 60)}</b> h <b>${m4 % 60}</b> min`],
    [`${j} jours = ${TROU} h`, `${j} jours = <b>${24 * j}</b> h`],
    [`Un quart d'heure = ${TROU} min ; trois quarts d'heure = ${TROU} min`, `Un quart d'heure = <b>15</b> min ; trois quarts d'heure = <b>45</b> min`],
  ] as [string, string][]).slice(0, Math.max(3, Math.min(6, r.combien)));
  return {
    consigne: "Complète : 1 jour = 24 h ; 1 h = 60 min ; 1 min = 60 s.",
    corps: lignes(items.map(([t]) => t)), corrige: lignes(items.map(([, c]) => c)),
  };
}

/** Une horloge à trois aiguilles : la petite, la grande, la trotteuse. */
function horlogeSvg(t: number | null): string {
  const tick = Array.from({ length: 60 }, (_, i) => {
    const a = (i * 6 * Math.PI) / 180, r1 = i % 5 ? 17 : 15.5;
    return `<line x1="${20 + r1 * Math.sin(a)}" y1="${20 - r1 * Math.cos(a)}" x2="${20 + 18 * Math.sin(a)}" y2="${20 - 18 * Math.cos(a)}" stroke="#1c2233" stroke-width="${i % 5 ? 0.25 : 0.5}"/>`;
  }).join("");
  const chiffres = Array.from({ length: 12 }, (_, i) => { const a = ((i + 1) * 30 * Math.PI) / 180; return `<text x="${20 + 12.6 * Math.sin(a)}" y="${20 - 12.6 * Math.cos(a) + 1.3}" font-size="3.6" text-anchor="middle" fill="#1c2233">${i + 1}</text>`; }).join("");
  let aiguilles = "";
  if (t !== null) {
    const h = (t / 3600) % 12, m = (t % 3600) / 60, s = t % 60;
    const aiguille = (angle: number, long: number, larg: number, couleur: string) => { const a = (angle * Math.PI) / 180; return `<line x1="20" y1="20" x2="${20 + long * Math.sin(a)}" y2="${20 - long * Math.cos(a)}" stroke="${couleur}" stroke-width="${larg}" stroke-linecap="round"/>`; };
    aiguilles = aiguille(h * 30, 9, 1.4, "#1c2233") + aiguille(m * 6, 14, 0.9, "#1c2233") + aiguille(s * 6, 16, 0.35, "#d94033");
  }
  return `<svg class="gr-horloge" viewBox="0 0 40 40" width="38mm" height="38mm"><circle cx="20" cy="20" r="18.5" fill="#fff" stroke="#1c2233" stroke-width="0.6"/>${tick}${chiffres}${aiguilles}<circle cx="20" cy="20" r="0.8" fill="#1c2233"/></svg>`;
}

function horlogesSecondes(alea: Alea, r: ReglagesGrandeursCM): Bloc {
  const items = Array.from({ length: Math.max(2, Math.min(6, r.combien)) }, (_, i) => ({ t: entier(alea, 1, 12 * 3600 - 1), lire: i % 3 !== 2 }));
  return {
    consigne: "Lis l'heure : la petite aiguille donne les heures, la grande les minutes, la trotteuse — en rouge — les secondes. Pour les dernières, dessine les trois aiguilles.",
    corps: `<div class="gr-figures">${items.map(({ t, lire }) => `<div class="gr-case">${horlogeSvg(lire ? t : null)}<div>${lire ? `${TROU} h ${TROU} min ${TROU} s` : `${ecrireDuree(t, true, true)}`}</div></div>`).join("")}</div>`,
    corrige: `<div class="gr-figures">${items.map(({ t }) => `<div class="gr-case">${horlogeSvg(t)}<div><b>${ecrireDuree(t, true, true)}</b></div></div>`).join("")}</div>`,
  };
}

const FABRIQUES: Record<ExerciceGrandeurs, (alea: Alea, r: ReglagesGrandeursCM) => Bloc> = {
  convertir, ranger, calculer, unite, estimer, perimetre, "perimetre-probleme": perimetreProbleme,
  "aire-pavage": airePavage, "aire-cm2": aireCm2, "aire-encadrer": aireEncadrer, "aire-perimetre": airePerimetre, "aire-rectangle": aireRectangle, "aire-convertir": aireConvertir,
  "angles-nature": anglesNature, "angles-comparer": anglesComparer, "angles-nommer": anglesNommer, "angles-degres": anglesDegres,
  durees, "durees-problemes": dureesProblemes, "durees-convertir": dureesConvertir, "horloges-secondes": horlogesSecondes,
};

export function htmlGrandeursCM(r: ReglagesGrandeursCM, graine: number): string {
  const alea = hasard(graine);
  const titre = r.titre ?? "Grandeurs et mesures";
  const exos: string[] = [], corriges: string[] = [];
  EXERCICES_GRANDEURS.map((e) => e.id).filter((e) => r.exercices.includes(e)).forEach((ex, i) => {
    const b = FABRIQUES[ex](alea, { ...r, combien: Math.max(1, Math.min(10, r.combien)) });
    exos.push(`<div class="gr-exo"><div class="gr-consigne"><b>${i + 1}.</b> <span class="consigne">${b.consigne}</span></div>${b.corps}</div>`);
    corriges.push(`<div class="gr-exo"><div class="gr-consigne"><b>${i + 1}.</b> ${b.consigne}</div>${b.corrige}</div>`);
  });
  return feuille(`<div class="page"><div class="titre">${escapeHtml(titre)}</div><div class="sous">Prénom : ........................................ Date : ........................</div>${exos.join("")}</div>
    <div class="page corrige"><div class="titre">${escapeHtml(titre)} — corrigé</div>${corriges.join("")}</div>`, "gr");
}

export const STYLE_GRANDEURS_CM = `
  .feuille.gr .gr-exo { margin: 0 0 6mm; }
  .feuille.gr .gr-consigne { font-size: 13px; margin-bottom: 3mm; break-after: avoid; page-break-after: avoid; break-inside: avoid; page-break-inside: avoid; }
  .feuille.gr .gr-lignes > div { font-size: 15px; margin: 0 0 4mm; line-height: 1.8; break-inside: avoid; page-break-inside: avoid; }
  .feuille.gr .gr-trou { display: inline-block; width: 16mm; height: 7mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; vertical-align: middle; }
  .feuille.gr .gr-trait { display: inline-block; min-width: 90mm; border-bottom: 1px dotted #9aa0b4; height: 6mm; vertical-align: bottom; }
  .feuille.gr .gr-ecrire { font-size: 13px; color: #4b5266; margin-top: 1mm; }
  .feuille.gr .gr-rang { margin-top: 1.5mm; }
  .feuille.gr .gr-choix { display: inline-block; padding: 0.5mm 2.5mm; margin: 0 1mm; border: 1px solid #c4c9d6; border-radius: 3mm; }
  .feuille.gr .gr-frac { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; font-size: 12px; line-height: 1.1; margin: 0 0.5mm; }
  .feuille.gr .gr-frac > span:first-child { border-bottom: 1px solid #1c2233; padding: 0 0.6mm; }
  .feuille.gr .gr-figures { display: flex; flex-wrap: wrap; gap: 6mm 10mm; align-items: flex-end; margin: 0 0 4mm; }
  .feuille.gr .gr-case { break-inside: avoid; page-break-inside: avoid; font-size: 13.5px; max-width: 82mm; }
  .feuille.gr .gr-case > div { margin-top: 1.5mm; line-height: 1.7; }
  .feuille.gr .gr-reponse { align-self: center; }
  .feuille.gr .gr-cadre { height: 24mm; border: 1.2px dashed #9aa0b4; border-radius: 2mm; margin: 2mm 0 0; }
  .feuille.gr .gr-chapeau { position: relative; display: inline-block; }
  .feuille.gr .gr-chapeau::before { content: "^"; position: absolute; left: 0; right: 0; top: -0.55em; text-align: center; font-weight: 400; }
  .feuille.gr svg { display: block; }
`;
