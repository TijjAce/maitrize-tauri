// ── Les canards dessinés : à colorier, à décorer ──────────────────────────
//
// Deux exercices de l'enseignant, repris pour la séquence du Vilain Petit
// Canard : les familles de canards à colorier — une cane et ses petits, des
// canetons jaunes et des vilains petits canards gris, toutes les familles
// différentes : on décompose une quantité — et les canards à décorer — le
// motif commencé, à continuer jusqu'au bout.
//
// Les pictogrammes sont en couleurs : il faut ici des contours, à colorier
// ou à remplir. Ils sont dessinés pour Maitrize, en SVG : chaque canard est
// fait de formes simples — la tête, le bec, le corps et sa queue — dont on ne
// trace que le contour commun. Les formes, élargies de l'épaisseur du trait,
// se peignent d'abord en noir, puis se repeignent dedans : il ne reste que
// la silhouette, sans trait au cou.

const ENCRE = "#1c2233";

/** Le caneton, comme un canard de bain, tourné vers la gauche : cadre 0-100 × 0-80. */
const CANETON = [
  '<circle cx="34" cy="25" r="17"/>',
  '<path d="M19 21 Q4 21 3 28 Q12 34 21 31 Z"/>',
  '<path d="M18 52 Q18 34 40 38 Q58 42 72 38 L94 26 Q100 44 88 62 Q76 76 46 75 Q20 74 18 52 Z"/>',
];
const OEIL_CANETON = `<circle cx="31" cy="21" r="3.2" fill="${ENCRE}"/>`;
const AILE_CANETON = `<path d="M44 52 Q58 68 76 54" fill="none" stroke="${ENCRE}" stroke-width="3" stroke-linecap="round"/>`;

/** La cane, debout, au long cou : cadre 0-70 × 0-100. */
const CANE = [
  '<circle cx="24" cy="18" r="12"/>',
  '<path d="M13 15 Q2 15 1 21 Q8 26 14 23 Z"/>',
  '<path d="M16 24 Q14 44 22 54 L40 52 Q30 42 32 24 Z"/>',
  '<path d="M14 64 Q14 48 34 48 Q52 48 60 44 L70 36 Q72 52 64 66 Q56 80 36 80 Q16 80 14 64 Z"/>',
];
const DETAILS_CANE = `<path d="M30 80 L28 93 M44 80 L46 93 M22 95 L28 93 L34 96 M40 95 L46 93 L52 96" fill="none" stroke="${ENCRE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
  + `<path d="M30 62 Q42 76 58 62" fill="none" stroke="${ENCRE}" stroke-width="2.4" stroke-linecap="round"/><circle cx="21" cy="15" r="2.2" fill="${ENCRE}"/>`;

/** Le contour commun de formes, d'épaisseur `ep`, et leur fond. */
const contour = (formes: string[], ep: number, fond: string) =>
  `<g fill="${ENCRE}" stroke="${ENCRE}" stroke-width="${ep * 2}" stroke-linejoin="round">${formes.join("")}</g><g fill="${fond}" stroke="none">${formes.join("")}</g>`;

/** Les couleurs des deux sortes de petits, dans le corrigé et la légende ; le mot les dit aussi. */
export const JAUNE = "#f6d04d";
export const GRIS = "#a4a8b0";

/** Un caneton à colorier — ou colorié, pour la légende et le corrigé. */
export const svgCaneton = (fond = "#fff") =>
  `<svg class="cd-caneton" viewBox="-4 -4 108 88" role="img" aria-label="un caneton">${contour(CANETON, 2.6, fond)}${AILE_CANETON}${OEIL_CANETON}</svg>`;

/** La cane, la maman de la famille. */
export const svgCane = () => `<svg class="cd-cane" viewBox="-4 -4 78 108" role="img" aria-label="la cane">${contour(CANE, 2.2, "#fff")}${DETAILS_CANE}</svg>`;

// ── Les motifs graphiques ─────────────────────────────────────────────────
//
// Chaque motif se dessine dans une bande, de x0 à x1, entre y0 et y1, dans
// le cadre du caneton.

export type Motif = "traits" | "points" | "ronds" | "vagues" | "pics" | "creneaux" | "boucles" | "rondTrait" | "ecailles";

export const NOMS_DES_MOTIFS: Record<Motif, string> = {
  traits: "des traits", points: "des points", ronds: "des ronds", vagues: "des vagues", pics: "des pics", creneaux: "des créneaux",
  boucles: "des boucles", rondTrait: "un rond, un trait", ecailles: "des écailles",
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const trait = (d: string, ep = 1.3) => `<path d="${d}" fill="none" stroke="${ENCRE}" stroke-width="${ep}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rond = (x: number, y: number, r: number) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="none" stroke="${ENCRE}" stroke-width="1.3"/>`;

const MOTIFS: Record<Motif, (x0: number, x1: number, y0: number, y1: number) => string> = {
  traits: (x0, x1, y0, y1) => {
    let d = "";
    for (let x = x0; x <= x1; x += 4.5) d += `M${r1(x)} ${y0 + 1}V${y1 - 1}`;
    return trait(d);
  },
  points: (x0, x1, y0, y1) => {
    let s = "";
    for (let x = x0 + 2; x <= x1; x += 5) s += `<circle cx="${r1(x)}" cy="${r1((y0 + y1) / 2)}" r="1.3" fill="${ENCRE}"/>`;
    return s;
  },
  ronds: (x0, x1, y0, y1) => {
    const r = (y1 - y0) / 2 - 1.2;
    let s = "";
    for (let x = x0 + r + 1; x <= x1; x += 2 * r + 2.5) s += rond(x, (y0 + y1) / 2, r);
    return s;
  },
  vagues: (x0, x1, y0, y1) => {
    const m = (y0 + y1) / 2, a = (y1 - y0) / 2 - 1;
    let d = `M${r1(x0)} ${r1(m)}`;
    for (let x = x0; x < x1; x += 8) d += ` q2 ${r1(-a * 2)} 4 0 t4 0`;
    return trait(d);
  },
  pics: (x0, x1, y0, y1) => {
    let d = `M${r1(x0)} ${y1 - 1}`;
    for (let x = x0; x < x1; x += 6) d += ` L${r1(x + 3)} ${y0 + 1} L${r1(x + 6)} ${y1 - 1}`;
    return trait(d);
  },
  creneaux: (x0, x1, y0, y1) => {
    let d = `M${r1(x0)} ${y1 - 1}`;
    for (let x = x0; x < x1; x += 8) d += ` V${y0 + 1} H${r1(x + 4)} V${y1 - 1} H${r1(x + 8)}`;
    return trait(d);
  },
  boucles: (x0, x1, y0, y1) => {
    const h = y1 - y0 - 2;
    let d = `M${r1(x0)} ${y1 - 1}`;
    for (let x = x0; x < x1; x += 6) d += ` c3 0 5 ${r1(-h * 0.75)} 3 ${r1(-h)} c-2 -0.2 -3 ${r1(h * 0.6)} 3 ${r1(h)}`;
    return trait(d, 1.2);
  },
  rondTrait: (x0, x1, y0, y1) => {
    const r = (y1 - y0) / 2 - 1.5, m = (y0 + y1) / 2;
    let s = "";
    for (let x = x0 + r + 1, i = 0; x <= x1; x += r + 4, i++) s += i % 2 ? trait(`M${r1(x - r / 2)} ${y0 + 1}V${y1 - 1}`) : rond(x, m, r);
    return s;
  },
  ecailles: (x0, x1, y0, y1) => {
    // Des demi-ronds posés sur le bas de la bande, qui y tiennent.
    const r = Math.min(3.2, (y1 - y0 - 2) / 2);
    let d = "";
    for (let x = x0; x < x1; x += 2 * r) d += `M${r1(x)} ${y1 - 1} a${r} ${r} 0 0 1 ${2 * r} 0`;
    return trait(d);
  },
};

/** Le bord gauche du corps du caneton, à cette hauteur : le motif commence contre lui. */
const bordGauche = (y: number) => (y <= 55 ? 19 : y <= 60 ? 20.5 : y <= 65 ? 23 : y <= 70 ? 28 : 33);

/** Où le motif commencé s'arrête : l'élève le continue jusqu'au bout. */
const FIN_DU_DEBUT = 50;

/** Les bandes du corps : deux larges, ou trois plus fines. */
export const BANDES: Record<2 | 3, [number, number][]> = {
  2: [[45, 56], [60, 71]],
  3: [[42, 51], [54, 63], [66, 75]],
};

let compteur = 0;

/**
 * Un caneton à décorer : ses bandes guidées en pointillés, et dans chacune
 * le début de son motif ; une bande sans motif est libre. Le motif ne sort
 * pas du canard.
 */
export function svgCanetonADecorer(motifs: (Motif | null)[]): string {
  const bandes = BANDES[motifs.length === 3 ? 3 : 2];
  const id = `cd-clip-${++compteur}`;
  const guides = bandes.map(([y0, y1]) => `<path d="M0 ${y0}H100M0 ${y1}H100" stroke="#8a90a4" stroke-width="0.6" stroke-dasharray="1.2 1.6"/>`).join("");
  const debuts = bandes.map(([y0, y1], i) => {
    const m = motifs[i];
    return m ? MOTIFS[m](bordGauche(y1) + 1, FIN_DU_DEBUT, y0, y1) : "";
  }).join("");
  return `<svg class="cd-a-decorer" viewBox="-4 -4 108 88" role="img" aria-label="un canard à décorer"><defs><clipPath id="${id}">${CANETON.join("")}</clipPath></defs>`
    + `${contour(CANETON, 2.4, "#fff")}<g clip-path="url(#${id})">${guides}${debuts}</g>${OEIL_CANETON}</svg>`;
}

/** Les décorations de chaque canard : en MS, un motif par canard ; en GS, trois bandes et le dernier libre. */
export const DECORATIONS: Record<"MS" | "GS", (Motif | null)[][]> = {
  MS: [["traits", "traits"], ["points", "points"], ["ronds", "ronds"], ["vagues", "vagues"], ["pics", "pics"], ["creneaux", "creneaux"]],
  GS: [["boucles", "points", "boucles"], ["rondTrait", "vagues", "rondTrait"], ["ecailles", "traits", "ecailles"],
    ["pics", "creneaux", "pics"], ["vagues", "ronds", "vagues"], [null, null, null]],
};

/** Ce qu'on dit d'une décoration : ses motifs, sans répéter le même. */
export function nomDeLaDecoration(motifs: (Motif | null)[]): string {
  const vus = [...new Set(motifs.filter((m): m is Motif => m != null))];
  return vus.length ? vus.map((m) => NOMS_DES_MOTIFS[m]).join(" et ") : "ma décoration, que j'invente";
}

export const STYLE_CANARDS_DESSINES = `
  .feuille svg.cd-caneton, .feuille svg.cd-cane, .feuille svg.cd-a-decorer { display: block; }
`;
