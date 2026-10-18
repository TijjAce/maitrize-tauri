// L'espace et la géométrie du cours moyen, d'après le programme de
// mathématiques du cycle 3 (2025) et ses exemples de réussite (Éduscol, 2025).
//
// Les droites perpendiculaires et parallèles, reconnues puis tracées à
// l'équerre en vraie grandeur ; le cercle et le disque, ensembles de points
// à une distance donnée d'un centre ; les figures usuelles, nommées en
// s'appuyant sur leur définition — « c'est un rectangle, car c'est un
// quadrilatère qui a quatre angles droits » ; les constructions des exemples
// de réussite ; le symétrique d'une figure sur quadrillage, par rapport à une
// droite verticale, horizontale, ou au CM2 une diagonale. Les solides : le
// prisme droit, leurs faces, le patron du pavé ; les assemblages de cubes à
// dénombrer, et au CM2 leurs vues.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { choisir, entier, fr } from "./nombres";
import { escapeHtml } from "./print";
import { assemblageCubesSvg, solideSvg, type Assemblage } from "./solides";

export type ExerciceGeometrieCM =
  | "perpendiculaires" | "paralleles" | "vocabulaire" | "cercle" | "figures" | "constructions" | "programme" | "symetrique"
  | "solides" | "faces" | "patron-cube" | "patron-pave" | "cubes-compter" | "vues";

export const EXERCICES_GEOMETRIE_CM: { id: ExerciceGeometrieCM; libelle: string }[] = [
  { id: "vocabulaire", libelle: "Point, droite, segment, demi-droite ; les codes" },
  { id: "perpendiculaires", libelle: "Des droites perpendiculaires" },
  { id: "paralleles", libelle: "Des droites parallèles" },
  { id: "cercle", libelle: "Le cercle et le disque" },
  { id: "figures", libelle: "Nommer une figure, et dire pourquoi" },
  { id: "constructions", libelle: "Construire sur papier uni" },
  { id: "programme", libelle: "Écrire un programme de construction (CM2)" },
  { id: "symetrique", libelle: "Le symétrique d'une figure, sur quadrillage" },
  { id: "solides", libelle: "Nommer les solides" },
  { id: "faces", libelle: "Faces, sommets, arêtes" },
  { id: "patron-cube", libelle: "Les faces opposées d'un patron du cube" },
  { id: "patron-pave", libelle: "Le patron du pavé (CM2)" },
  { id: "cubes-compter", libelle: "Dénombrer les cubes d'un assemblage" },
  { id: "vues", libelle: "Les vues d'un assemblage de cubes (CM2)" },
];

export interface ReglagesGeometrieCM { classe: "CM1" | "CM2"; exercices: ExerciceGeometrieCM[]; combien: number; titre?: string }
export const REGLAGES_GEOMETRIE_CM: ReglagesGeometrieCM = { classe: "CM1", exercices: ["perpendiculaires"], combien: 4 };

interface Bloc { consigne: string; corps: string; corrige: string }
type Alea = () => number;
type Pt = [number, number];
const NOIR = "#1c2233", ROUGE = "#d94033", BLEU = "#2454e6";
const TROU = '<span class="ge-trou"></span>';
const TRAIT = '<span class="ge-trait"></span>';
const n2 = (x: number) => Number(x.toFixed(2));
const rad = (d: number) => (d * Math.PI) / 180;
const lignes = (items: string[]) => `<div class="ge-lignes">${items.map((x) => `<div>${x}</div>`).join("")}</div>`;
const cases = (items: string[]) => `<div class="ge-figures">${items.map((x) => `<div class="ge-case">${x}</div>`).join("")}</div>`;
const choix = (mots: string[]) => mots.map((m) => `<span class="ge-choix">${m}</span>`).join(" ");

// ── Le dessin ─────────────────────────────────────────────────────────────

const segment = (a: Pt, b: Pt, couleur = NOIR, epaisseur = 0.5, tirets = false) =>
  `<line x1="${n2(a[0])}" y1="${n2(a[1])}" x2="${n2(b[0])}" y2="${n2(b[1])}" stroke="${couleur}" stroke-width="${epaisseur}"${tirets ? ' stroke-dasharray="2 1.4"' : ""}/>`;
const croix = (p: Pt, couleur = NOIR) => segment([p[0] - 1.2, p[1] - 1.2], [p[0] + 1.2, p[1] + 1.2], couleur, 0.4) + segment([p[0] - 1.2, p[1] + 1.2], [p[0] + 1.2, p[1] - 1.2], couleur, 0.4);
const texte = (p: Pt, t: string, taille = 3.6, couleur = NOIR, italique = true, ancre = "middle") =>
  `<text x="${n2(p[0])}" y="${n2(p[1])}" font-size="${taille}"${italique ? ' font-style="italic"' : ""} text-anchor="${ancre}" fill="${couleur}">${escapeHtml(t)}</text>`;
const cadre = (w: number, h: number, corps: string, mm = 1) => `<svg class="ge-dessin" viewBox="0 0 ${w} ${h}" width="${n2(w * mm)}mm" height="${n2(h * mm)}mm">${corps}</svg>`;

/** La droite passant par p, de direction angle (en degrés), coupée au cadre [m, w − m] × [m, h − m]. */
function droiteDansCadre(p: Pt, angle: number, w: number, h: number, m = 2): [Pt, Pt] {
  const d: Pt = [Math.cos(rad(angle)), Math.sin(rad(angle))];
  let tmin = -Infinity, tmax = Infinity;
  for (const k of [0, 1] as const) {
    const lim = k === 0 ? w : h;
    if (Math.abs(d[k]) < 1e-9) continue;
    const t1 = (m - p[k]) / d[k], t2 = (lim - m - p[k]) / d[k];
    tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
  }
  return [[p[0] + tmin * d[0], p[1] + tmin * d[1]], [p[0] + tmax * d[0], p[1] + tmax * d[1]]];
}

/** La marque d'un angle droit en s, entre les directions de a et de b. */
function angleDroit(s: Pt, a: Pt, b: Pt, taille = 2.6, couleur = NOIR): string {
  const u = [a[0] - s[0], a[1] - s[1]], v = [b[0] - s[0], b[1] - s[1]];
  const nu = Math.hypot(u[0], u[1]) || 1, nv = Math.hypot(v[0], v[1]) || 1;
  const p1: Pt = [s[0] + (u[0] / nu) * taille, s[1] + (u[1] / nu) * taille], p3: Pt = [s[0] + (v[0] / nv) * taille, s[1] + (v[1] / nv) * taille];
  const p2: Pt = [p1[0] + (v[0] / nv) * taille, p1[1] + (v[1] / nv) * taille];
  return `<polyline points="${n2(p1[0])},${n2(p1[1])} ${n2(p2[0])},${n2(p2[1])} ${n2(p3[0])},${n2(p3[1])}" fill="none" stroke="${couleur}" stroke-width="0.35"/>`;
}

/** Les petits traits qui codent les côtés de même longueur. */
function traits(a: Pt, b: Pt, combien: number): string {
  if (!combien) return "";
  const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const u: Pt = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  return Array.from({ length: combien }, (_, t) => {
    const o: Pt = [m[0] + u[0] * (t - (combien - 1) / 2) * 1.3, m[1] + u[1] * (t - (combien - 1) / 2) * 1.3];
    return segment([o[0] - u[1] * 1.5, o[1] + u[0] * 1.5], [o[0] + u[1] * 1.5, o[1] - u[0] * 1.5], NOIR, 0.4);
  }).join("");
}

/** Un polygone : ses sommets nommés, ses côtés codés, ses angles droits marqués. */
function polygone(pts: Pt[], noms: string[], codes: number[], droits: number[], fond = "#eef1fb"): string {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return `<polygon points="${pts.map((p) => `${n2(p[0])},${n2(p[1])}`).join(" ")}" fill="${fond}" stroke="${NOIR}" stroke-width="0.5"/>`
    + pts.map((p, i) => traits(p, pts[(i + 1) % pts.length], codes[i] ?? 0)).join("")
    + droits.map((i) => angleDroit(pts[i], pts[(i + pts.length - 1) % pts.length], pts[(i + 1) % pts.length])).join("")
    + noms.map((t, i) => { const p = pts[i], d = Math.hypot(p[0] - cx, p[1] - cy) || 1; return t ? texte([p[0] + ((p[0] - cx) / d) * 3.6, p[1] + ((p[1] - cy) / d) * 3.6 + 1.2], t) : ""; }).join("");
}

const tourner = (pts: Pt[], angle: number): Pt[] => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const c = Math.cos(rad(angle)), s = Math.sin(rad(angle));
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
};
/** Les points recadrés dans une boîte, avec une marge. */
const recadrer = (pts: Pt[], marge: number): { pts: Pt[]; w: number; h: number } => {
  const minX = Math.min(...pts.map((p) => p[0])), minY = Math.min(...pts.map((p) => p[1]));
  const q = pts.map(([x, y]) => [x - minX + marge, y - minY + marge] as Pt);
  return { pts: q, w: Math.max(...q.map((p) => p[0])) + marge, h: Math.max(...q.map((p) => p[1])) + marge };
};

// ── Les droites ───────────────────────────────────────────────────────────

/** Deux droites qui se coupent dans le cadre, d'un angle donné. */
function deuxDroites(alea: Alea, ecart: number, w = 64, h = 42): string {
  const o: Pt = [w / 2 + (alea() - 0.5) * 12, h / 2 + (alea() - 0.5) * 8], a = entier(alea, 0, 179);
  const [p, q] = droiteDansCadre(o, a, w, h), [r, s] = droiteDansCadre(o, a + ecart, w, h);
  return segment(p, q, NOIR, 0.5) + segment(r, s, BLEU, 0.5);
}

/** Une droite (d) et un point A hors de la droite, en vraie grandeur : la construction à faire à l'équerre. */
function droiteEtPoint(alea: Alea, w = 82, h = 52): { a: number; P: Pt; A: Pt; H: Pt; dessin: string } {
  const a = entier(alea, 0, 179), P: Pt = [w / 2 + (alea() - 0.5) * 10, h / 2 + (alea() - 0.5) * 6];
  const distance = entier(alea, 14, 22), cote = alea() < 0.5 ? 1 : -1;
  const nrm: Pt = [-Math.sin(rad(a)) * cote, Math.cos(rad(a)) * cote];
  const t = (alea() - 0.5) * 20, H: Pt = [P[0] + Math.cos(rad(a)) * t, P[1] + Math.sin(rad(a)) * t];
  const A: Pt = [H[0] + nrm[0] * distance, H[1] + nrm[1] * distance];
  const [p, q] = droiteDansCadre(P, a, w, h);
  const etiquette: Pt = [p[0] + (q[0] - p[0]) * 0.08 - nrm[0] * 4, p[1] + (q[1] - p[1]) * 0.08 - nrm[1] * 4 + 1.2];
  return { a, P, A, H, dessin: segment(p, q) + texte(etiquette, "(d)", 3.4) + croix(A) + texte([A[0] + 3, A[1] - 2], "A") };
}

function perpendiculaires(alea: Alea, r: ReglagesGeometrieCM): Bloc {
  const ecarts = melanger(alea, [90, 90, entier(alea, 55, 75), entier(alea, 82, 86), entier(alea, 105, 125), 90]).slice(0, Math.max(2, Math.min(6, r.combien)));
  const paires = ecarts.map((e) => ({ e, dessin: deuxDroites(alea, e) }));
  const constructions = Array.from({ length: 2 }, () => droiteEtPoint(alea));
  const w = 82, h = 52;
  const perp = (c: (typeof constructions)[number]) => { const [p, q] = droiteDansCadre(c.A, c.a + 90, w, h); return segment(p, q, ROUGE, 0.5) + angleDroit(c.H, c.A, [c.H[0] + Math.cos(rad(c.a)) * 5, c.H[1] + Math.sin(rad(c.a)) * 5], 2.6, ROUGE); };
  return {
    consigne: "Ces droites sont-elles perpendiculaires ? Quand tu hésites, vérifie avec ton équerre. Puis trace, à l'équerre, la droite perpendiculaire à (d) qui passe par A.",
    corps: cases(paires.map((x) => `${cadre(64, 42, x.dessin)}<div>${choix(["perpendiculaires", "non"])}</div>`))
      + cases(constructions.map((c) => cadre(w, h, c.dessin))),
    corrige: cases(paires.map((x) => `${cadre(64, 42, x.dessin)}<div><b>${x.e === 90 ? "Perpendiculaires : elles forment un angle droit." : "Non : elles ne forment pas d'angle droit."}</b></div>`))
      + cases(constructions.map((c) => cadre(w, h, c.dessin + perp(c)))),
  };
}

function paralleles(alea: Alea, r: ReglagesGeometrieCM): Bloc {
  const sortes = melanger(alea, ["paralleles", "paralleles", "secantes-dehors", "secantes", "secantes-dehors", "paralleles"]).slice(0, Math.max(2, Math.min(6, r.combien)));
  const w = 64, h = 42;
  const paires = sortes.map((s) => {
    const a = entier(alea, 0, 179);
    if (s === "paralleles") {
      const ecart = entier(alea, 10, 18), o: Pt = [w / 2, h / 2], nrm: Pt = [-Math.sin(rad(a)), Math.cos(rad(a))];
      const o2: Pt = [o[0] + nrm[0] * ecart, o[1] + nrm[1] * ecart], o1: Pt = [o[0] - nrm[0] * ecart / 2, o[1] - nrm[1] * ecart / 2];
      const [p, q] = droiteDansCadre(o1, a, w, h), [u, v] = droiteDansCadre([o2[0] - nrm[0] * ecart / 2, o2[1] - nrm[1] * ecart / 2], a, w, h);
      return { s, dessin: segment(p, q) + segment(u, v, BLEU) };
    }
    if (s === "secantes") return { s, dessin: deuxDroites(alea, entier(alea, 25, 50), w, h) };
    // Clairement sécantes, mais le point d'intersection est hors de la feuille.
    const angle = entier(alea, 10, 16) * (alea() < 0.5 ? 1 : -1), o: Pt = [w / 2, h / 2], nrm: Pt = [-Math.sin(rad(a)), Math.cos(rad(a))];
    const [p, q] = droiteDansCadre([o[0] - nrm[0] * 8, o[1] - nrm[1] * 8], a, w, h), [u, v] = droiteDansCadre([o[0] + nrm[0] * 8, o[1] + nrm[1] * 8], a + angle, w, h);
    return { s, dessin: segment(p, q) + segment(u, v, BLEU) };
  });
  const constructions = Array.from({ length: 2 }, () => droiteEtPoint(alea));
  const W = 82, H = 52;
  const para = (c: (typeof constructions)[number]) => {
    const [p, q] = droiteDansCadre(c.A, c.a, W, H), [u, v] = droiteDansCadre(c.A, c.a + 90, W, H);
    return segment(u, v, "#7a8195", 0.35, true) + segment(p, q, ROUGE, 0.5) + angleDroit(c.H, c.A, [c.H[0] + Math.cos(rad(c.a)) * 5, c.H[1] + Math.sin(rad(c.a)) * 5], 2.6, "#7a8195");
  };
  const reponse = (s: string) => (s === "paralleles" ? "Parallèles : elles ne se coupent pas." : s === "secantes" ? "Sécantes : elles se coupent sur la feuille." : "Sécantes : elles se coupent, hors de la feuille.");
  return {
    consigne: "Ces droites sont-elles parallèles ou sécantes ? Puis trace la droite parallèle à (d) qui passe par A : trace d'abord à l'équerre la perpendiculaire à (d) passant par A, puis la perpendiculaire à cette droite, toujours en A.",
    corps: cases(paires.map((x) => `${cadre(w, h, x.dessin)}<div>${choix(["parallèles", "sécantes"])}</div>`)) + cases(constructions.map((c) => cadre(W, H, c.dessin))),
    corrige: cases(paires.map((x) => `${cadre(w, h, x.dessin)}<div><b>${reponse(x.s)}</b></div>`)) + cases(constructions.map((c) => cadre(W, H, c.dessin + para(c)))),
  };
}

// ── Le vocabulaire et les codes ───────────────────────────────────────────

function vocabulaire(alea: Alea, r: ReglagesGeometrieCM): Bloc {
  // Pas de M : c'est le nom du milieu à placer.
  const [A, B, C, D, E, F] = melanger(alea, ["A", "B", "C", "D", "E", "F", "K", "L", "R", "S", "T", "U"]).slice(0, 6);
  const w = 96, h = 46;
  // Une droite par deux points, un segment, une demi-droite : leurs noms se lisent sur le dessin.
  const pa: Pt = [16, 10], pb: Pt = [44, 16], pc: Pt = [12, 36], pd: Pt = [12 + 10 * entier(alea, 3, 5), 36], pe: Pt = [64, 40], pf: Pt = [78, 22];
  const [d1, d2] = droiteDansCadre(pa, (Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180) / Math.PI, w, h);
  const ue = [(pf[0] - pe[0]), (pf[1] - pe[1])], le = Math.hypot(ue[0], ue[1]);
  const fin: Pt = [pe[0] + (ue[0] / le) * 30, pe[1] + (ue[1] / le) * 30];
  const dessin = segment(d1, d2) + segment(pc, pd) + segment(pe, fin)
    + [[pa, A], [pb, B], [pc, C], [pd, D], [pe, E], [pf, F]].map(([p, t]) => croix(p as Pt) + texte([(p as Pt)[0], (p as Pt)[1] - 2.6], t as string)).join("");
  const milieu: Pt = [(pc[0] + pd[0]) / 2, 36];
  const questions = (corrige: boolean) => lignes([
    `La droite tracée : ${corrige ? `<b>(${A}${B})</b>` : TROU} ; le segment : ${corrige ? `<b>[${C}${D}]</b>` : TROU} ; la demi-droite : ${corrige ? `<b>[${E}${F})</b>` : TROU}`,
    `Place le milieu M du segment [${C}${D}]. Il est à ${corrige ? `<b>${fr((pd[0] - pc[0]) / 20, (pd[0] - pc[0]) % 20 ? 1 : 0)} cm</b>` : TROU} de ${C}.`,
  ]);
  // Les codes : une figure dont les côtés égaux et les angles droits sont codés.
  const L = entier(alea, 26, 40), l = entier(alea, 14, 22);
  const fig = recadrer(tourner([[0, 0], [L, 0], [L, l], [0, l]], entier(alea, -20, 20)), 6);
  const codes = (corrige: boolean) => `${cadre(fig.w, fig.h, polygone(fig.pts, ["P", "Q", "R", "S"], [1, 2, 1, 2], [0, 1, 2, 3]))}<div>Les côtés de même longueur : ${corrige ? "<b>[PQ] et [RS] ; [QR] et [SP]</b>" : `${TRAIT}`}</div><div>Les angles droits : ${corrige ? "<b>les quatre angles, en P, Q, R et S</b>" : TRAIT}</div>`;
  // Au CM2, les symboles ⊥, //, ∈ et ∉.
  const symboles: [string, string][] = [["(d) est perpendiculaire à (e)", "(d) ⊥ (e)"], ["(AB) est parallèle à (CD)", "(AB) // (CD)"], ["Le point M appartient à la droite (d)", "M ∈ (d)"], ["Le point N n'appartient pas au segment [AB]", "N ∉ [AB]"]];
  const cm2 = r.classe === "CM2";
  return {
    consigne: `Lis le dessin : nomme la droite, le segment et la demi-droite, puis place un milieu. Lis les codes de la figure.${cm2 ? " Enfin, écris chaque phrase avec un symbole : ⊥, //, ∈ ou ∉." : ""}`,
    corps: cadre(w, h, dessin) + questions(false) + cases([codes(false)]) + (cm2 ? lignes(symboles.map(([p]) => `${escapeHtml(p)} : ${TROU}`)) : ""),
    corrige: cadre(w, h, dessin + croix(milieu, ROUGE) + texte([milieu[0], milieu[1] + 5], "M", 3.6, ROUGE)) + questions(true) + cases([codes(true)])
      + (cm2 ? lignes(symboles.map(([p, s]) => `${escapeHtml(p)} : <b>${escapeHtml(s)}</b>`)) : ""),
  };
}

// ── Le cercle ─────────────────────────────────────────────────────────────

function cercle(alea: Alea, _r: ReglagesGeometrieCM): Bloc {
  // Le vocabulaire : centre, rayon, diamètre, corde, arc.
  const O: Pt = [26, 24], R = 18, a0 = entier(alea, 0, 359);
  const pt = (a: number): Pt => [O[0] + R * Math.cos(rad(a)), O[1] + R * Math.sin(rad(a))];
  const [A, B, C, D, E, F, G] = [pt(a0), pt(a0 + 110), pt(a0 + 290), pt(a0 + 160), pt(a0 + 230), pt(a0 + 300), pt(a0 + 350)];
  const arc = `<path d="M ${n2(F[0])} ${n2(F[1])} A ${R} ${R} 0 0 1 ${n2(G[0])} ${n2(G[1])}" fill="none" stroke="${ROUGE}" stroke-width="1"/>`;
  const vocab = `<circle cx="${O[0]}" cy="${O[1]}" r="${R}" fill="none" stroke="${NOIR}" stroke-width="0.5"/>${arc}`
    + segment(O, A, BLEU, 0.6) + segment(B, C, "#1f9a48", 0.6) + segment(D, E, "#8e44ad", 0.6) + croix(O) + texte([O[0] + 2.5, O[1] + 4], "O");
  const questions: [string, string][] = [["Le point O est le", "centre"], ["Le segment bleu est un", "rayon"], ["Le segment vert, qui passe par O, est un", "diamètre"], ["Le segment violet est une", "corde"], ["La partie rouge du cercle est un", "arc de cercle"]];
  // En vraie grandeur : les points sur le cercle, dans le disque, hors du disque.
  const rayon = choisir(alea, [20, 25, 30]), centre: Pt = [42, 40];
  const distances = melanger(alea, [rayon, rayon, rayon - entier(alea, 5, 9), rayon - entier(alea, 10, 14), rayon + entier(alea, 5, 8), rayon + entier(alea, 8, 10)]);
  const angles = melanger(alea, [0, 60, 120, 180, 240, 300]).map((a) => a + entier(alea, -15, 15));
  const lettres = ["K", "L", "M", "N", "P", "R"];
  const points = distances.map((d, i) => ({ nom: lettres[i], d, p: [centre[0] + d * Math.cos(rad(angles[i])), centre[1] + d * Math.sin(rad(angles[i]))] as Pt }));
  const reel = (corrige: boolean) => cadre(84, 80, croix(centre) + texte([centre[0] + 3, centre[1] + 4], "O") + points.map((x) => croix(x.p) + texte([x.p[0] + 2.8, x.p[1] - 1.8], x.nom)).join("")
    + (corrige ? `<circle cx="${centre[0]}" cy="${centre[1]}" r="${rayon}" fill="${ROUGE}" fill-opacity="0.08" stroke="${ROUGE}" stroke-width="0.5"/>` : ""));
  const sur = points.filter((x) => x.d === rayon).map((x) => x.nom).sort(), dans = points.filter((x) => x.d <= rayon).map((x) => x.nom).sort();
  const cm = fr(rayon / 10, rayon % 10 ? 1 : 0);
  return {
    consigne: `Nomme chaque élément du cercle. Puis trace le cercle de centre O et de rayon ${cm} cm : ce sont tous les points situés à ${cm} cm de O.`,
    corps: cases([cadre(52, 48, vocab)]) + lignes(questions.map(([q]) => `${escapeHtml(q)} ${TROU}`)) + cases([reel(false)])
      + lignes([`Les points sur le cercle : ${TROU}`, `Les points du disque de centre O et de rayon ${cm} cm — à ${cm} cm de O au plus : ${TROU}`]),
    corrige: cases([cadre(52, 48, vocab)]) + lignes(questions.map(([q, rep]) => `${escapeHtml(q)} <b>${rep}</b>.`)) + cases([reel(true)])
      + lignes([`Les points sur le cercle : <b>${sur.join(" et ")}</b>`, `Les points du disque : <b>${dans.join(", ")}</b>`]),
  };
}

// ── Les figures ───────────────────────────────────────────────────────────

interface Figure { nom: string; pourquoi: string; pts: Pt[]; codes: number[]; droits: number[] }
const FIGURES_CM1 = ["carré", "rectangle", "losange", "triangle rectangle", "triangle isocèle", "triangle équilatéral", "quadrilatère"];
const FIGURES_CM2 = [...FIGURES_CM1, "trapèze", "trapèze rectangle", "pentagone", "hexagone"];

function figureUsuelle(alea: Alea, nom: string): Figure {
  const c = entier(alea, 22, 30), L = entier(alea, 30, 38), l = entier(alea, 14, 20);
  switch (nom) {
    case "carré": return { nom, pourquoi: "c'est un quadrilatère qui a quatre angles droits et quatre côtés de même longueur", pts: [[0, 0], [c, 0], [c, c], [0, c]], codes: [1, 1, 1, 1], droits: [0, 1, 2, 3] };
    case "rectangle": return { nom, pourquoi: "c'est un quadrilatère qui a quatre angles droits ; ses côtés ne sont pas tous de même longueur : ce n'est pas un carré", pts: [[0, 0], [L, 0], [L, l], [0, l]], codes: [1, 2, 1, 2], droits: [0, 1, 2, 3] };
    case "losange": { const dx = entier(alea, 14, 18), dy = entier(alea, 9, 12);
      return { nom, pourquoi: "c'est un quadrilatère qui a quatre côtés de même longueur ; il n'a pas d'angle droit : ce n'est pas un carré", pts: [[0, dy], [dx, 0], [2 * dx, dy], [dx, 2 * dy]], codes: [1, 1, 1, 1], droits: [] }; }
    case "triangle rectangle": return { nom, pourquoi: "c'est un triangle qui a un angle droit", pts: [[0, 0], [0, l + 6], [L, l + 6]], codes: [0, 0, 0], droits: [1] };
    case "triangle isocèle": { const b = entier(alea, 18, 26), hh = entier(alea, 24, 32);
      return { nom, pourquoi: "c'est un triangle qui a deux côtés de même longueur", pts: [[0, hh], [b, hh], [b / 2, 0]], codes: [0, 1, 1], droits: [] }; }
    case "triangle équilatéral": return { nom, pourquoi: "c'est un triangle qui a trois côtés de même longueur", pts: [[0, c * 0.866], [c, c * 0.866], [c / 2, 0]], codes: [1, 1, 1], droits: [] };
    case "trapèze": { const b = entier(alea, 32, 40), t = entier(alea, 14, 22), hh = entier(alea, 14, 20), d = entier(alea, 3, b - t - 3);
      return { nom, pourquoi: "c'est un quadrilatère qui a deux côtés opposés parallèles", pts: [[0, hh], [b, hh], [d + t, 0], [d, 0]], codes: [0, 0, 0, 0], droits: [] }; }
    case "trapèze rectangle": { const b = entier(alea, 32, 40), t = entier(alea, 16, 24), hh = entier(alea, 14, 20);
      return { nom, pourquoi: "c'est un trapèze — deux côtés opposés parallèles — qui a un angle droit", pts: [[0, hh], [b, hh], [t, 0], [0, 0]], codes: [0, 0, 0, 0], droits: [0, 3] }; }
    case "pentagone": case "hexagone": { const k = nom === "pentagone" ? 5 : 6, rr = 16;
      return { nom, pourquoi: `c'est un polygone qui a ${k === 5 ? "cinq" : "six"} côtés`, pts: Array.from({ length: k }, (_, i) => [rr + rr * Math.cos(rad(-90 + (360 / k) * i)), rr + rr * Math.sin(rad(-90 + (360 / k) * i))] as Pt), codes: Array(k).fill(0), droits: [] }; }
    default: return { nom: "quadrilatère", pourquoi: "c'est un polygone à quatre côtés, sans angle droit ni côtés de même longueur : ce n'est ni un carré, ni un rectangle, ni un losange", pts: [[0, 6], [L - 4, 0], [L, l + 4], [6, l]], codes: [0, 0, 0, 0], droits: [] };
  }
}

function figures(alea: Alea, r: ReglagesGeometrieCM): Bloc {
  const noms = melanger(alea, r.classe === "CM2" ? FIGURES_CM2 : FIGURES_CM1).slice(0, Math.max(3, Math.min(6, r.combien)));
  const lettres = "ABCDEF";
  const figs = noms.map((nom, i) => {
    const f = figureUsuelle(alea, nom);
    const angle = nom.startsWith("trapèze") ? 0 : choisir(alea, [0, 0, 15, -20, 30]);
    const b = recadrer(tourner(f.pts, angle), 6);
    return { ...f, lettre: lettres[i], dessin: cadre(b.w, b.h, polygone(b.pts, [], f.codes, f.droits)) };
  });
  return {
    consigne: "Nomme chaque figure, et dis pourquoi : « c'est un …, car c'est un … qui a … ». Les codes disent les angles droits et les côtés de même longueur ; sinon, vérifie avec tes instruments.",
    corps: cases(figs.map((f) => `<b>${f.lettre}</b>${f.dessin}<div>C'est un <span class="ge-trait ge-court"></span></div><div>car <span class="ge-trait ge-court"></span></div>`)),
    corrige: cases(figs.map((f) => `<b>${f.lettre}</b>${f.dessin}<div><b>C'est un ${f.nom}</b>, car ${f.pourquoi}.</div>`)),
  };
}

// ── Les constructions ─────────────────────────────────────────────────────

/** Une figure du corrigé, à l'échelle 1/2 : ses points, ses segments, ses cercles, ses codes. */
interface Trace { pts: Record<string, Pt>; segments: [string, string][]; cercles: { centre: string; r: number }[]; droits: [string, string, string][]; egaux: [string, string, number][] }
function dessinerTrace(t: Trace): string {
  const tous = Object.values(t.pts).concat(t.cercles.flatMap((c) => { const o = t.pts[c.centre]; return [[o[0] - c.r, o[1] - c.r], [o[0] + c.r, o[1] + c.r]] as Pt[]; }));
  const minX = Math.min(...tous.map((p) => p[0])) - 6, minY = Math.min(...tous.map((p) => p[1])) - 6;
  const P = (n: string): Pt => [t.pts[n][0] - minX, t.pts[n][1] - minY];
  const w = Math.max(...tous.map((p) => p[0])) - minX + 6, h = Math.max(...tous.map((p) => p[1])) - minY + 6;
  const cx = Object.keys(t.pts).reduce((s, n) => s + P(n)[0], 0) / Object.keys(t.pts).length, cy = Object.keys(t.pts).reduce((s, n) => s + P(n)[1], 0) / Object.keys(t.pts).length;
  const corps = t.cercles.map((c) => `<circle cx="${n2(P(c.centre)[0])}" cy="${n2(P(c.centre)[1])}" r="${n2(c.r)}" fill="none" stroke="${BLEU}" stroke-width="0.5"/>`).join("")
    + t.segments.map(([a, b]) => segment(P(a), P(b))).join("")
    + t.droits.map(([s, a, b]) => angleDroit(P(s), P(a), P(b))).join("") + t.egaux.map(([a, b, k]) => traits(P(a), P(b), k)).join("")
    + Object.keys(t.pts).filter((n) => !n.startsWith("_")).map((n) => { const p = P(n), d = Math.hypot(p[0] - cx, p[1] - cy) || 1; return texte([p[0] + ((p[0] - cx) / d) * 3.4, p[1] + ((p[1] - cy) / d) * 3.4 + 1.2], n); }).join("");
  return cadre(w, h, corps, 0.5);
}

function constructions(alea: Alea, r: ReglagesGeometrieCM): Bloc {
  const items: { texte: string; trace: Trace }[] = [];
  if (r.classe === "CM1") {
    const L = entier(alea, 6, 9), l = entier(alea, 3, 5);
    items.push({ texte: `Construis un rectangle ABCD tel que le segment [AB] mesure ${L} cm et le segment [BC] mesure ${l} cm. Code les angles droits et les côtés de même longueur.`,
      trace: { pts: { A: [0, l * 10], B: [L * 10, l * 10], C: [L * 10, 0], D: [0, 0] }, segments: [["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"]], cercles: [], droits: [["A", "D", "B"], ["B", "A", "C"], ["C", "B", "D"], ["D", "C", "A"]], egaux: [["A", "B", 1], ["C", "D", 1], ["B", "C", 2], ["D", "A", 2]] } });
    const c = entier(alea, 4, 6);
    items.push({ texte: `Construis un carré KLMN dont les côtés mesurent ${c} cm, puis le cercle qui a pour diamètre le segment [LM].`,
      trace: { pts: { K: [0, c * 10], L: [c * 10, c * 10], M: [c * 10, 0], N: [0, 0], _I: [c * 10, c * 5] }, segments: [["K", "L"], ["L", "M"], ["M", "N"], ["N", "K"]], cercles: [{ centre: "_I", r: c * 5 }], droits: [["K", "N", "L"], ["L", "K", "M"], ["M", "L", "N"], ["N", "M", "K"]], egaux: [["K", "L", 1], ["L", "M", 1], ["M", "N", 1], ["N", "K", 1]] } });
    const a = entier(alea, 7, 10), b = entier(alea, 4, 6);
    items.push({ texte: `Construis un triangle RST, rectangle en R, tel que RS = ${a} cm et RT = ${b} cm.`,
      trace: { pts: { R: [0, b * 10], S: [a * 10, b * 10], T: [0, 0] }, segments: [["R", "S"], ["S", "T"], ["T", "R"]], cercles: [], droits: [["R", "T", "S"]], egaux: [] } });
    const L2 = entier(alea, 5, 7), l2 = entier(alea, 3, 4);
    items.push({ texte: `Trace un rectangle ABCD tel que AB = ${L2} cm et BC = ${l2} cm. Trace le cercle de centre A qui passe par le milieu du côté [AB].`,
      trace: { pts: { A: [0, l2 * 10], B: [L2 * 10, l2 * 10], C: [L2 * 10, 0], D: [0, 0], _I: [L2 * 5, l2 * 10] }, segments: [["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"]], cercles: [{ centre: "A", r: L2 * 5 }], droits: [["A", "D", "B"], ["B", "A", "C"], ["C", "B", "D"], ["D", "C", "A"]], egaux: [["A", "_I", 1], ["_I", "B", 1]] } });
  } else {
    const ab = entier(alea, 5, 7), bc = entier(alea, ab + 2, ab + 4), ac = Math.sqrt(bc * bc - ab * ab) * 10;
    items.push({ texte: `Construis un triangle ABC, rectangle en A, tel que le segment [AB] mesure ${ab} cm et le segment [BC] mesure ${bc} cm.`,
      trace: { pts: { A: [0, ac], B: [ab * 10, ac], C: [0, 0] }, segments: [["A", "B"], ["B", "C"], ["C", "A"]], cercles: [], droits: [["A", "C", "B"]], egaux: [] } });
    const cote = entier(alea, 5, 7), diag = entier(alea, 4, 2 * cote - 2), demi = Math.sqrt(cote * cote - (diag / 2) ** 2) * 10, rayon = entier(alea, 3, 5);
    items.push({ texte: `Construis un losange KLMN dont les côtés mesurent ${cote} cm et dont la diagonale [KM] mesure ${diag} cm ; puis le cercle de centre L et de rayon ${rayon} cm.`,
      trace: { pts: { K: [0, demi], L: [diag * 5, 2 * demi], M: [diag * 10, demi], N: [diag * 5, 0] }, segments: [["K", "L"], ["L", "M"], ["M", "N"], ["N", "K"], ["K", "M"]], cercles: [{ centre: "L", r: rayon * 10 }], droits: [], egaux: [["K", "L", 1], ["L", "M", 1], ["M", "N", 1], ["N", "K", 1]] } });
    const rs = entier(alea, 5, 8) + choisir(alea, [0, 0.4, 0.5]);
    items.push({ texte: `Construis un triangle RST, isocèle et rectangle en R, tel que RS = ${fr(rs, Number.isInteger(rs) ? 0 : 1)} cm.`,
      trace: { pts: { R: [0, rs * 10], S: [rs * 10, rs * 10], T: [0, 0] }, segments: [["R", "S"], ["S", "T"], ["T", "R"]], cercles: [], droits: [["R", "T", "S"]], egaux: [["R", "S", 1], ["R", "T", 1]] } });
    const ah = entier(alea, 2, 4), hb = entier(alea, 3, 5);
    items.push({ texte: `Trace une droite (d) et un point A à ${ah} cm de (d). Trace la perpendiculaire à (d) qui passe par A ; elle coupe (d) en H. Place sur (d) un point B à ${hb} cm de H. Trace le triangle ABH, puis le cercle de centre H qui passe par A.`,
      trace: { pts: { A: [hb * 10 + 15, 0], H: [hb * 10 + 15, ah * 10], B: [15, ah * 10], _G: [hb * 10 + 15 + 25, ah * 10], _F: [0, ah * 10] }, segments: [["_F", "_G"], ["A", "H"], ["H", "B"], ["B", "A"]], cercles: [{ centre: "H", r: ah * 10 }], droits: [["H", "A", "_G"]], egaux: [] } });
  }
  const choisis = melanger(alea, items).slice(0, Math.max(1, Math.min(4, r.combien)));
  return {
    consigne: "Construis chaque figure sur papier uni, avec ta règle graduée, ton équerre et ton compas. Code les angles droits et les longueurs égales.",
    corps: choisis.map((x) => `<div class="ge-construction"><div>${escapeHtml(x.texte)}</div><div class="ge-cadre"></div></div>`).join(""),
    corrige: choisis.map((x) => `<div class="ge-construction"><div>${escapeHtml(x.texte)}</div>${dessinerTrace(x.trace)}<div class="ge-note">Réduit de moitié.</div></div>`).join(""),
  };
}

/** Au CM2 : écrire un programme de construction pour une figure donnée. */
function programme(alea: Alea, r: ReglagesGeometrieCM): Bloc {
  const L = entier(alea, 5, 7), l = entier(alea, 3, 4), c = entier(alea, 4, 6), ab = entier(alea, 4, 6), ac = entier(alea, 3, 5);
  const candidats: { trace: Trace; programme: string; legende: string }[] = [
    { trace: { pts: { A: [0, l * 10], B: [L * 10, l * 10], C: [L * 10, 0], D: [0, 0], I: [L * 5, l * 10] }, segments: [["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"]] as [string, string][], cercles: [{ centre: "A", r: L * 5 }], droits: [["A", "D", "B"], ["B", "A", "C"], ["C", "B", "D"], ["D", "C", "A"]] as [string, string, string][], egaux: [["A", "I", 1], ["I", "B", 1]] as [string, string, number][] },
      legende: `AB = ${L} cm ; BC = ${l} cm.`, programme: `Trace un rectangle ABCD tel que AB = ${L} cm et BC = ${l} cm. Place le milieu I du côté [AB]. Trace le cercle de centre A qui passe par I.` },
    { trace: { pts: { A: [0, c * 10], B: [c * 10, c * 10], C: [c * 10, 0], D: [0, 0], O: [c * 5, c * 5] }, segments: [["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"], ["A", "C"], ["B", "D"]] as [string, string][], cercles: [{ centre: "O", r: c * 5 * Math.SQRT2 }], droits: [["A", "D", "B"], ["B", "A", "C"], ["C", "B", "D"], ["D", "C", "A"]] as [string, string, string][], egaux: [["A", "B", 1], ["B", "C", 1], ["C", "D", 1], ["D", "A", 1]] as [string, string, number][] },
      legende: `AB = ${c} cm.`, programme: `Trace un carré ABCD de ${c} cm de côté. Trace ses diagonales [AC] et [BD] ; elles se coupent en O. Trace le cercle de centre O qui passe par A.` },
    { trace: { pts: { A: [0, ac * 10], B: [ab * 10, ac * 10], C: [0, 0] }, segments: [["A", "B"], ["B", "C"], ["C", "A"]] as [string, string][], cercles: [], droits: [["A", "C", "B"]] as [string, string, string][], egaux: [] as [string, string, number][] },
      legende: `AB = ${ab} cm ; AC = ${ac} cm.`, programme: `Trace un segment [AB] de ${ab} cm. Trace la perpendiculaire à (AB) qui passe par A. Place sur cette droite le point C à ${ac} cm de A. Trace le triangle ABC.` },
  ];
  const items = melanger(alea, candidats).slice(0, Math.max(1, Math.min(2, r.combien)));
  return {
    consigne: "Écris un programme de construction pour chaque figure : les étapes, dans l'ordre, avec les longueurs. Ton voisin doit pouvoir la construire sans la voir.",
    corps: items.map((x) => `<div class="ge-construction">${dessinerTrace(x.trace)}<div class="ge-note">${escapeHtml(x.legende)}</div>${lignes([TRAIT, TRAIT, TRAIT, TRAIT])}</div>`).join(""),
    corrige: items.map((x) => `<div class="ge-construction">${dessinerTrace(x.trace)}<div class="ge-note">${escapeHtml(x.legende)}</div><div><b>Par exemple :</b> ${escapeHtml(x.programme)}</div></div>`).join(""),
  };
}

// ── La symétrie ───────────────────────────────────────────────────────────

/** Un triangle sur les nœuds du quadrillage, d'un seul côté de l'axe, et son symétrique. */
function symetrique(alea: Alea, r: ReglagesGeometrieCM): Bloc {
  const C = 5;
  const axes: ("verticale" | "horizontale" | "diagonale")[] = r.classe === "CM2" ? melanger(alea, ["diagonale", "verticale", "horizontale"]) : melanger(alea, ["verticale", "horizontale"]);
  const items = axes.slice(0, Math.max(1, Math.min(r.classe === "CM2" ? 3 : 2, r.combien))).map((axe) => {
    const n = 14;
    const image = (p: Pt): Pt => (axe === "verticale" ? [n - p[0], p[1]] : axe === "horizontale" ? [p[0], n - p[1]] : [p[1], p[0]]);
    const permis = (p: Pt) => (axe === "verticale" ? p[0] >= 1 && p[0] <= n / 2 - 1 : axe === "horizontale" ? p[1] >= 1 && p[1] <= n / 2 - 1 : p[0] >= p[1] + 1);
    let pts: Pt[] = [];
    for (let garde = 0; garde < 200; garde++) {
      pts = Array.from({ length: 3 }, () => [entier(alea, 1, n - 1), entier(alea, 1, n - 1)] as Pt);
      const aire = Math.abs((pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[2][0] - pts[0][0]) * (pts[1][1] - pts[0][1])) / 2;
      if (pts.every(permis) && aire >= 4) break;
    }
    const grille = Array.from({ length: n + 1 }, (_, i) => segment([i * C, 0], [i * C, n * C], "#c4c9d6", 0.2) + segment([0, i * C], [n * C, i * C], "#c4c9d6", 0.2)).join("");
    const ligneAxe = axe === "verticale" ? segment([(n / 2) * C, 0], [(n / 2) * C, n * C], ROUGE, 0.7) : axe === "horizontale" ? segment([0, (n / 2) * C], [n * C, (n / 2) * C], ROUGE, 0.7) : segment([0, 0], [n * C, n * C], ROUGE, 0.7);
    const tri = (q: Pt[], couleur: string, fond: string) => `<polygon points="${q.map((p) => `${p[0] * C},${p[1] * C}`).join(" ")}" fill="${fond}" stroke="${couleur}" stroke-width="0.5"/>`;
    const svg = (corrige: boolean) => cadre(n * C, n * C, grille + ligneAxe + tri(pts, NOIR, "#c7d2fe") + (corrige ? tri(pts.map(image), BLEU, "#dbeafe") : ""));
    return { axe, svg };
  });
  return {
    consigne: "Construis le symétrique de chaque triangle par rapport à la droite rouge. Compte les carreaux de chaque sommet jusqu'à la droite ; vérifie en pliant la feuille le long de la droite.",
    corps: cases(items.map((x) => `${x.svg(false)}<div>La droite est ${x.axe === "diagonale" ? "une diagonale du quadrillage" : x.axe}.</div>`)),
    corrige: cases(items.map((x) => `${x.svg(true)}<div>Le symétrique, en bleu.</div>`)),
  };
}

// ── Les solides ───────────────────────────────────────────────────────────

/**
 * Un prisme droit à base triangulaire, couché sur une face latérale, comme on
 * le dessine à l'école : la base triangulaire devant, les arêtes qui fuient
 * vers le haut à droite ; les arêtes cachées en pointillés.
 */
function prismeSvg(mm = 32): string {
  const K = 0.5 * Math.SQRT1_2, a = 22, h = 16, p = 22;
  const pr = (x: number, y: number, z: number): Pt => [x + K * y, -z - K * y];
  const [A, B, S] = [pr(0, 0, 0), pr(a, 0, 0), pr(a / 2, 0, h)], [A2, B2, S2] = [pr(0, p, 0), pr(a, p, 0), pr(a / 2, p, h)];
  const surface = (pts: Pt[], fond: string) => `<path d="M${pts.map((q) => `${n2(q[0])} ${n2(q[1])}`).join(" L")} Z" fill="${fond}" stroke="none"/>`;
  const corps = surface([B, B2, S2, S], "#b9c8e8") + surface([A, B, S], "#dfe7f7")
    + segment(A, B, NOIR, 0.6) + segment(B, S, NOIR, 0.6) + segment(S, A, NOIR, 0.6) + segment(S, S2, NOIR, 0.6) + segment(B, B2, NOIR, 0.6) + segment(B2, S2, NOIR, 0.6)
    + segment(A, A2, NOIR, 0.4, true) + segment(A2, B2, NOIR, 0.4, true) + segment(A2, S2, NOIR, 0.4, true);
  const tous = [A, B, S, A2, B2, S2], xs = tous.map((q) => q[0]), ys = tous.map((q) => q[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return `<svg class="ge-solide" viewBox="-20 -20 40 40" width="${mm}mm" height="${mm}mm"><g transform="translate(${n2(-cx)} ${n2(-cy)})">${corps}</g></svg>`;
}

const DESSINS_SOLIDES: Record<string, () => string> = {
  cube: () => solideSvg("cube", [], false, 32), "pavé": () => solideSvg("pavé", [], false, 32), boule: () => solideSvg("boule", [], false, 32),
  cylindre: () => solideSvg("cylindre", [], false, 32), "cône": () => solideSvg("cône", [], false, 32), pyramide: () => solideSvg("pyramide", [], true, 32),
  "pyramide à base triangulaire": () => solideSvg("pyramide à base triangulaire", [], true, 32), "prisme droit": () => prismeSvg(),
};

function solides(alea: Alea, r: ReglagesGeometrieCM): Bloc {
  const noms = melanger(alea, Object.keys(DESSINS_SOLIDES)).slice(0, Math.max(4, Math.min(8, r.combien)));
  const lettres = "ABCDEFGH";
  return {
    consigne: "Écris le nom de chaque solide : cube, pavé, boule, cylindre, cône, pyramide, prisme droit. Les arêtes cachées sont en pointillés.",
    corps: cases(noms.map((n, i) => `<b>${lettres[i]}</b>${DESSINS_SOLIDES[n]()}<div>${TRAIT}</div>`)),
    corrige: cases(noms.map((n, i) => `<b>${lettres[i]}</b>${DESSINS_SOLIDES[n]()}<div><b>${n === "pyramide à base triangulaire" ? "une pyramide (à base triangulaire)" : n === "pyramide" ? "une pyramide (à base carrée)" : n}</b></div>`)),
  };
}

const DESCRIPTIONS: { nom: string; dessin: () => string; faces: string; nature: string; sommets: number; aretes: number; cm2?: boolean }[] = [
  { nom: "le cube", dessin: () => solideSvg("cube", [], true, 26), faces: "6", nature: "6 carrés", sommets: 8, aretes: 12 },
  { nom: "le pavé", dessin: () => solideSvg("pavé", [], true, 26), faces: "6", nature: "6 rectangles", sommets: 8, aretes: 12 },
  { nom: "la pyramide à base carrée", dessin: () => solideSvg("pyramide", [], true, 26), faces: "5", nature: "1 carré, la base, et 4 triangles, les faces latérales", sommets: 5, aretes: 8 },
  { nom: "le prisme droit à base triangulaire", dessin: () => prismeSvg(26), faces: "5", nature: "2 triangles, les bases, et 3 rectangles, les faces latérales", sommets: 6, aretes: 9 },
  { nom: "la pyramide à base triangulaire", dessin: () => solideSvg("pyramide à base triangulaire", [], true, 26), faces: "4", nature: "4 triangles", sommets: 4, aretes: 6, cm2: true },
];

function faces(_alea: Alea, r: ReglagesGeometrieCM): Bloc {
  const liste = DESCRIPTIONS.filter((d) => !d.cm2 || r.classe === "CM2");
  const tableau = (corrige: boolean) => `<table class="ge-tableau"><thead><tr><th>Le solide</th><th>Faces</th><th>Leur nature</th><th>Sommets</th><th>Arêtes</th></tr></thead><tbody>`
    + liste.map((d) => `<tr><td>${d.dessin()}<div>${d.nom}</div></td><td>${corrige ? `<b>${d.faces}</b>` : ""}</td><td>${corrige ? `<b>${d.nature}</b>` : ""}</td><td>${corrige ? `<b>${d.sommets}</b>` : ""}</td><td>${corrige ? `<b>${d.aretes}</b>` : ""}</td></tr>`).join("")
    + "</tbody></table>";
  return {
    consigne: "Complète le tableau. Aide-toi des solides de la classe : compte en marquant ce que tu as déjà compté.",
    corps: tableau(false), corrige: tableau(true),
  };
}

// ── Les patrons ───────────────────────────────────────────────────────────

/** Les faces du cube qui tombent sur chaque carré d'un patron : on fait rouler le cube sur le patron. */
export function facesDuPatron(cases: Pt[]): string[] | null {
  type Cube = { bas: string; haut: string; nord: string; sud: string; est: string; ouest: string };
  const rouler = (c: Cube, dx: number, dy: number): Cube => (dx === 1 ? { ...c, bas: c.est, est: c.haut, haut: c.ouest, ouest: c.bas }
    : dx === -1 ? { ...c, bas: c.ouest, ouest: c.haut, haut: c.est, est: c.bas }
      : dy === -1 ? { ...c, bas: c.nord, nord: c.haut, haut: c.sud, sud: c.bas } : { ...c, bas: c.sud, sud: c.haut, haut: c.nord, nord: c.bas });
  const cle = (p: Pt) => `${p[0]},${p[1]}`;
  const etat = new Map<string, Cube>([[cle(cases[0]), { bas: "1", haut: "6", nord: "2", sud: "5", est: "3", ouest: "4" }]]);
  const file: Pt[] = [cases[0]];
  while (file.length) {
    const p = file.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q: Pt = [p[0] + dx, p[1] + dy];
      if (!cases.some((c) => c[0] === q[0] && c[1] === q[1]) || etat.has(cle(q))) continue;
      etat.set(cle(q), rouler(etat.get(cle(p))!, dx, dy));
      file.push(q);
    }
  }
  const faces = cases.map((c) => etat.get(cle(c))?.bas ?? "?");
  return new Set(faces).size === 6 ? faces : null;
}
const OPPOSEE: Record<string, string> = { "1": "6", "6": "1", "2": "5", "5": "2", "3": "4", "4": "3" };

/** Les onze patrons du cube, à une rotation ou une symétrie près : les assemblages de six carrés sur lesquels le cube roule sans revenir deux fois sur une face. */
export const PATRONS_DU_CUBE: Pt[][] = [
  [[0, 1], [1, 1], [2, 0], [2, 1], [3, 0], [4, 0]], [[0, 1], [1, 1], [2, 0], [2, 1], [2, 2], [3, 2]], [[0, 2], [1, 1], [1, 2], [2, 0], [2, 1], [3, 1]],
  [[0, 3], [1, 1], [1, 2], [1, 3], [2, 0], [2, 1]], [[0, 2], [1, 0], [1, 1], [1, 2], [1, 3], [2, 0]], [[0, 3], [1, 0], [1, 1], [1, 2], [1, 3], [2, 0]],
  [[0, 2], [1, 0], [1, 1], [1, 2], [1, 3], [2, 3]], [[0, 1], [1, 1], [2, 1], [3, 0], [3, 1], [3, 2]], [[0, 2], [1, 0], [1, 1], [1, 2], [1, 3], [2, 1]],
  [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1], [3, 1]], [[0, 2], [1, 1], [1, 2], [2, 0], [2, 1], [3, 0]],
];

function patronCube(alea: Alea, r: ReglagesGeometrieCM): Bloc {
  const C = 9, couleurs = ["#fde68a", "#c7d2fe", "#bbf7d0"];
  const choisis = melanger(alea, PATRONS_DU_CUBE).slice(0, Math.max(2, Math.min(3, r.combien)));
  const dessin = (cases: Pt[], corrige: boolean) => {
    const faces = facesDuPatron(cases)!;
    const paire = (f: string) => Math.min(Number(f), Number(OPPOSEE[f])) === 1 ? 0 : Math.min(Number(f), Number(OPPOSEE[f])) === 2 ? 1 : 2;
    const lettres = "ABCDEF";
    const w = (Math.max(...cases.map((c) => c[0])) + 1) * C + 2, h = (Math.max(...cases.map((c) => c[1])) + 1) * C + 2;
    return cadre(w, h, cases.map((c, i) => `<rect x="${c[0] * C + 1}" y="${c[1] * C + 1}" width="${C}" height="${C}" fill="${corrige ? couleurs[paire(faces[i])] : "#fff"}" stroke="${NOIR}" stroke-width="0.5"/>`
      + texte([c[0] * C + 1 + C / 2, c[1] * C + 1 + C / 2 + 1.3], lettres[i], 3.6, NOIR, false)).join(""));
  };
  const paires = (cases: Pt[]) => { const f = facesDuPatron(cases)!; const lettres = "ABCDEF"; const vues = new Set<number>();
    return f.map((x, i) => { if (vues.has(i)) return ""; const j = f.indexOf(OPPOSEE[x]); vues.add(i); vues.add(j); return `${lettres[i]} et ${lettres[j]}`; }).filter(Boolean).join(" ; "); };
  return {
    consigne: "Ces dessins sont des patrons du cube. Colorie de la même couleur les deux faces qui seront opposées une fois le cube monté. Tu peux découper un patron et le plier pour vérifier.",
    corps: cases(choisis.map((c) => `${dessin(c, false)}<div>Les faces opposées : ${TRAIT}</div>`)),
    corrige: cases(choisis.map((c) => `${dessin(c, true)}<div><b>${paires(c)}</b></div>`)),
  };
}

/** Au CM2 : trois assemblages de rectangles — un patron du pavé, un dont une face n'a pas la bonne taille, un auquel il manque une face. */
function patronPave(alea: Alea, _r: ReglagesGeometrieCM): Bloc {
  const C = 5;
  const [a, b, c] = melanger(alea, [[4, 2, 1], [3, 2, 1], [4, 3, 1], [4, 3, 2], [3, 2, 2]] as const)[0];
  // La croix : le fond au centre, les côtés autour, le dessus au bout.
  const faces = (fausse: boolean): { x: number; y: number; w: number; h: number; paire: number }[] => [
    { x: c, y: 0, w: a, h: c, paire: 0 }, { x: 0, y: c, w: c, h: b, paire: 1 }, { x: c, y: c, w: a, h: b, paire: 2 },
    { x: c + a, y: c, w: fausse ? c + 1 : c, h: b, paire: 1 }, { x: c, y: c + b, w: a, h: c, paire: 0 }, { x: c, y: 2 * c + b, w: a, h: b, paire: 2 },
  ];
  const assemblages = melanger(alea, [
    { faces: faces(false), patron: true, raison: "Oui : six faces, deux à deux identiques, chacune à sa place." },
    { faces: faces(true), patron: false, raison: "Non : la face de droite est trop large ; elle ne s'ajuste pas à la face de gauche, qui doit lui être identique." },
    { faces: faces(false).slice(0, 5), patron: false, raison: "Non : il n'y a que cinq faces ; un pavé en a six." },
  ]);
  const couleurs = ["#fde68a", "#c7d2fe", "#bbf7d0"];
  const dessin = (f: { x: number; y: number; w: number; h: number; paire: number }[], corrige: boolean, patron: boolean) => {
    const w = Math.max(...f.map((q) => q.x + q.w)) * C + 2, h = Math.max(...f.map((q) => q.y + q.h)) * C + 2;
    return cadre(w, h, f.map((q) => `<rect x="${q.x * C + 1}" y="${q.y * C + 1}" width="${q.w * C}" height="${q.h * C}" fill="${corrige && patron ? couleurs[q.paire] : "#fff"}" stroke="${NOIR}" stroke-width="0.5"/>`).join(""));
  };
  return {
    consigne: "Lequel de ces assemblages est un patron d'un pavé ? Dis pourquoi les autres n'en sont pas : le nombre de faces, leurs dimensions, leur position. Sur le patron, colorie de la même couleur les faces qui seront opposées.",
    corps: cases(assemblages.map((x, i) => `<b>${"ABC"[i]}</b>${dessin(x.faces, false, x.patron)}<div>${TRAIT}</div>`)),
    corrige: cases(assemblages.map((x, i) => `<b>${"ABC"[i]}</b>${dessin(x.faces, true, x.patron)}<div><b>${escapeHtml(x.raison)}</b></div>`)),
  };
}

// ── Les assemblages de cubes ──────────────────────────────────────────────

const pave = (a: number, b: number, c: number): Assemblage => Array.from({ length: a * b * c }, (_, i) => [i % a, Math.floor(i / a) % b, Math.floor(i / (a * b))]);

function cubesCompter(alea: Alea, r: ReglagesGeometrieCM): Bloc {
  const items: { svg: string; reponse: string; question: string }[] = [];
  const [a, b, c] = [entier(alea, 2, 4), entier(alea, 2, 3), entier(alea, 2, 3)];
  items.push({ svg: assemblageCubesSvg(pave(a, b, c), 7), question: "Combien de petits cubes y a-t-il dans ce pavé ?", reponse: `${c} couches de ${b} rangées de ${a} cubes : ${c} × ${b} × ${a} = ${a * b * c} cubes` });
  // Un escalier : des colonnes de hauteurs décroissantes, sur deux rangées.
  const marches = entier(alea, 3, 4), prof = entier(alea, 1, 2);
  const escalier: Assemblage = [];
  for (let x = 0; x < marches; x++) for (let y = 0; y < prof; y++) for (let z = 0; z < marches - x; z++) escalier.push([x, y, z]);
  const total = (prof * marches * (marches + 1)) / 2;
  items.push({ svg: assemblageCubesSvg(escalier, 7), question: "Combien de petits cubes faut-il pour construire cet escalier ?", reponse: `${Array.from({ length: marches }, (_, x) => (marches - x) * prof).join(" + ")} = ${total} cubes` });
  if (r.classe === "CM2") {
    // Au CM2 : combien de petits cubes a-t-on retirés du gros cube ?
    const n = entier(alea, 3, 4), k1 = entier(alea, 1, n - 1), k2 = entier(alea, 1, n - 1), k3 = entier(alea, 1, n - 1);
    const reste = pave(n, n, n).filter(([x, y, z]) => !(x >= n - k1 && z >= n - k2 && y < k3));
    items.push({ svg: assemblageCubesSvg(reste, 7), question: `Ce solide était un gros cube de ${n} petits cubes de côté. Combien de petits cubes a-t-on retirés ?`, reponse: `${n} × ${n} × ${n} = ${n ** 3} ; il en reste ${reste.length} ; on en a retiré ${k1 * k2 * k3} (${k3} × ${k2} × ${k1})` });
  }
  return {
    consigne: "Dénombre les petits cubes, ceux qu'on voit et ceux qu'on ne voit pas : compte par couches ou par colonnes.",
    corps: cases(items.map((x) => `${x.svg}<div>${escapeHtml(x.question)} ${TROU}</div>`)),
    corrige: cases(items.map((x) => `${x.svg}<div>${escapeHtml(x.question)} <b>${escapeHtml(x.reponse)}</b></div>`)),
  };
}

/** Les vues d'un assemblage : de face (x, z), de dessus (x, y), de droite (y, z), de gauche (y retourné, z). */
function vue(a: Assemblage, cote: "face" | "dessus" | "droite" | "gauche"): string {
  const C = 5;
  const occ = new Set<string>();
  const maxX = Math.max(...a.map((c) => c[0])), maxY = Math.max(...a.map((c) => c[1])), maxZ = Math.max(...a.map((c) => c[2]));
  for (const [x, y, z] of a) occ.add(cote === "face" ? `${x},${maxZ - z}` : cote === "dessus" ? `${x},${maxY - y}` : cote === "droite" ? `${y},${maxZ - z}` : `${maxY - y},${maxZ - z}`);
  const w = (cote === "face" || cote === "dessus" ? maxX : maxY) + 1, h = (cote === "dessus" ? maxY : maxZ) + 1;
  return cadre(w * C + 2, h * C + 2, [...occ].map((k) => { const [i, j] = k.split(",").map(Number); return `<rect x="${i * C + 1}" y="${j * C + 1}" width="${C}" height="${C}" fill="#c7d2fe" stroke="${NOIR}" stroke-width="0.4"/>`; }).join(""));
}

function vues(alea: Alea, _r: ReglagesGeometrieCM): Bloc {
  let a: Assemblage = [];
  for (let garde = 0; garde < 300; garde++) {
    // Quelques cubes sur un plateau de 3 × 2, empilés en colonnes.
    a = [];
    for (let x = 0; x < 3; x++) for (let y = 0; y < 2; y++) { const h = choisir(alea, [0, 1, 1, 2, 3]); for (let z = 0; z < h; z++) a.push([x, y, z]); }
    const formes = (["face", "dessus", "droite", "gauche"] as const).map((c) => vue(a, c));
    if (a.length >= 4 && a.length <= 9 && new Set(formes).size === 4 && a.some((c) => c[0] === 0) && a.some((c) => c[1] === 0)) break;
  }
  const ordre = melanger(alea, ["face", "dessus", "droite", "gauche"] as const);
  return {
    consigne: "Voici un assemblage de cubes et quatre de ses vues. Quelle lettre est la vue de face ? de dessus ? de droite ? de gauche ? Construis l'assemblage pour vérifier.",
    corps: cases([assemblageCubesSvg(a, 8), ...ordre.map((c, i) => `<b>${"ABCD"[i]}</b>${vue(a, c)}`)]) + lignes([`Vue de face : ${TROU} ; de dessus : ${TROU} ; de droite : ${TROU} ; de gauche : ${TROU}`]),
    corrige: cases([assemblageCubesSvg(a, 8), ...ordre.map((c, i) => `<b>${"ABCD"[i]}</b>${vue(a, c)}<div><b>vue ${c === "face" ? "de face" : c === "dessus" ? "de dessus" : c === "droite" ? "de droite" : "de gauche"}</b></div>`)]),
  };
}

const FABRIQUES: Record<ExerciceGeometrieCM, (alea: Alea, r: ReglagesGeometrieCM) => Bloc> = {
  perpendiculaires, paralleles, vocabulaire, cercle, figures, constructions, programme, symetrique,
  solides, faces, "patron-cube": patronCube, "patron-pave": patronPave, "cubes-compter": cubesCompter, vues,
};

export function htmlGeometrieCM(r: ReglagesGeometrieCM, graine: number): string {
  const alea = hasard(graine);
  const titre = r.titre ?? "Espace et géométrie";
  const exos: string[] = [], corriges: string[] = [];
  EXERCICES_GEOMETRIE_CM.map((e) => e.id).filter((e) => r.exercices.includes(e)).forEach((ex, i) => {
    const b = FABRIQUES[ex](alea, { ...r, combien: Math.max(1, Math.min(10, r.combien)) });
    exos.push(`<div class="ge-exo"><div class="ge-consigne"><b>${i + 1}.</b> <span class="consigne">${b.consigne}</span></div>${b.corps}</div>`);
    corriges.push(`<div class="ge-exo"><div class="ge-consigne"><b>${i + 1}.</b> ${b.consigne}</div>${b.corrige}</div>`);
  });
  return feuille(`<div class="page"><div class="titre">${escapeHtml(titre)}</div><div class="sous">Prénom : ........................................ Date : ........................</div>${exos.join("")}</div>
    <div class="page corrige"><div class="titre">${escapeHtml(titre)} — corrigé</div>${corriges.join("")}</div>`, "ge");
}

export const STYLE_GEOMETRIE_CM = `
  .feuille.ge .ge-exo { margin: 0 0 6mm; }
  .feuille.ge .ge-consigne { font-size: 13px; margin-bottom: 3mm; break-after: avoid; page-break-after: avoid; break-inside: avoid; page-break-inside: avoid; }
  .feuille.ge .ge-lignes > div { font-size: 14.5px; margin: 0 0 3.5mm; line-height: 1.8; break-inside: avoid; page-break-inside: avoid; }
  .feuille.ge .ge-trou { display: inline-block; width: 16mm; height: 7mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; vertical-align: middle; }
  .feuille.ge .ge-trait { display: inline-block; min-width: 70mm; border-bottom: 1px dotted #9aa0b4; height: 6mm; vertical-align: bottom; }
  .feuille.ge .ge-choix { display: inline-block; padding: 0.5mm 2.5mm; margin: 0 1mm; border: 1px solid #c4c9d6; border-radius: 3mm; font-size: 13px; }
  .feuille.ge .ge-figures { display: flex; flex-wrap: wrap; gap: 5mm 8mm; align-items: flex-end; margin: 0 0 4mm; }
  .feuille.ge .ge-case { break-inside: avoid; page-break-inside: avoid; font-size: 13.5px; max-width: 80mm; }
  .feuille.ge .ge-trait.ge-court { min-width: 50mm; }
  .feuille.ge .ge-case > div { margin-top: 1.5mm; line-height: 1.6; }
  .feuille.ge .ge-construction { break-inside: avoid; page-break-inside: avoid; font-size: 14px; margin: 0 0 5mm; }
  .feuille.ge .ge-cadre { height: 92mm; border: 1.2px dashed #9aa0b4; border-radius: 2mm; margin: 2mm 0 0; }
  .feuille.ge .ge-note { font-size: 12px; color: #4b5266; margin: 1mm 0; }
  .feuille.ge .ge-tableau { border-collapse: collapse; font-size: 13px; width: 100%; }
  .feuille.ge .ge-tableau th, .feuille.ge .ge-tableau td { border: 1px solid #9aa0b4; padding: 1.5mm 2mm; text-align: center; vertical-align: middle; }
  .feuille.ge .ge-tableau th { background: #f0f2f8; }
  .feuille.ge .ge-tableau td:first-child svg { margin: 0 auto; }
  .feuille.ge svg { display: block; }
`;
