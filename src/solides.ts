// Les solides au cycle 2 : reconnaître, nommer, décrire, construire.
//
// Programme de mathématiques du cycle 2 (2024) : au CP, trier et classer des
// solides — « le cube n'est pas considéré comme un pavé » —, nommer le cube,
// le pavé, la boule, décrire leurs faces, assembler les faces d'un cube ou
// d'un pavé ; au CE1, la pyramide, les faces, les sommets, les arêtes, des
// « recherches d'intrus, des jeux de Kim ou des jeux du portrait », les
// premières représentations en perspective cavalière ; au CE2, les arêtes
// cachées en pointillés, et « dire si un assemblage de polygones est ou non
// un patron d'un cube », à vérifier par des pliages effectifs. En repérage
// dans l'espace (CP, CE1) : construire des assemblages de cubes d'après un
// modèle ou une représentation plane. Éduscol, « Espace et géométrie au
// cycle 2 » (2002) : des solides aux figures planes, la face du cube et le
// carré.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export type Classe = "CP" | "CE1" | "CE2";
export type Solide = "cube" | "pavé" | "boule" | "cylindre" | "cône" | "pyramide" | "pyramide à base triangulaire";
export type ExerciceSolides = "nommer" | "objets" | "denombrer" | "portrait" | "intrus" | "patrons" | "patronCube" | "faces" | "assemblages";

export const EXERCICES_SOLIDES: { id: ExerciceSolides; libelle: string }[] = [
  { id: "nommer", libelle: "Reconnaître et nommer les solides" },
  { id: "objets", libelle: "Les objets et leur forme" },
  { id: "denombrer", libelle: "Faces, sommets, arêtes (CE1, CE2)" },
  { id: "portrait", libelle: "Le jeu du portrait : qui suis-je ? (CE1, CE2)" },
  { id: "intrus", libelle: "Cherche l'intrus (CE1, CE2)" },
  { id: "faces", libelle: "Les faces à découper et assembler" },
  { id: "patrons", libelle: "Est-ce un patron du cube ? (CE2)" },
  { id: "patronCube", libelle: "Le patron du cube à construire (CE2)" },
  { id: "assemblages", libelle: "Des assemblages de cubes à construire (CP, CE1)" },
];

export interface ReglagesSolides {
  exercice: ExerciceSolides;
  classe: Classe;
  /** Les arêtes cachées en pointillés (CE2). */
  cachees: boolean;
  /** Le solide dont on découpe les faces. */
  solide: "cube" | "pavé" | "pyramide";
  combien: number;
}

export const REGLAGES_SOLIDES: ReglagesSolides = { exercice: "nommer", classe: "CE1", cachees: false, solide: "cube", combien: 8 };

const NOIR = "#1c2233";
const LETTRES = "ABCDEFGHIJKLMNOP";
const f2 = (x: number) => x.toFixed(2);
const entre = (alea: () => number, a: number, b: number) => a + Math.floor(alea() * (b - a + 1));

const SOURCE = `<span style="color:#687087">— Programme de mathématiques du cycle 2, 2024 ; Éduscol, « Espace et géométrie au cycle 2 ».</span>`;
const entete = (titre: string, consigne: string) => `<div class="titre">${titre}</div>
  <div class="sous">Prénom : ........................................ Date : ........................</div>
  <div class="regle">${consigne} ${SOURCE}</div>`;

// ── Le dessin en perspective cavalière ────────────────────────────────────

type P3 = [number, number, number];
type P = [number, number];

/** La perspective cavalière : la profondeur fuit vers le haut à droite, à 45°, réduite de moitié. */
const K = 0.5 * Math.SQRT1_2;
const projeter = ([x, y, z]: P3): P => [x + K * y, -z - K * y];

const FACE = { devant: "#dfe7f7", dessus: "#f3f6fc", droite: "#b9c8e8" };

/** Un segment, plein ou en pointillés (une arête cachée). */
const arete = (a: P, b: P, cachee = false) => `<line x1="${f2(a[0])}" y1="${f2(a[1])}" x2="${f2(b[0])}" y2="${f2(b[1])}" stroke="${NOIR}" stroke-width="${cachee ? 0.4 : 0.6}"${cachee ? ' stroke-dasharray="1.6 1.2"' : ""}/>`;
const surface = (pts: P[], fond: string) => `<path d="M${pts.map((p) => `${f2(p[0])} ${f2(p[1])}`).join(" L")} Z" fill="${fond}" stroke="none"/>`;

/** Le dessin d'un solide dans une case de 40 × 40 : ses dimensions comptent (un pavé plat, un cylindre haut…). */
export function solideSvg(s: Solide, dims: number[] = [], cachees = false, mm = 36): string {
  let corps = "";
  let points: P[] = [];
  if (s === "cube" || s === "pavé") {
    const [l, p, h] = s === "cube" ? [dims[0] ?? 20, dims[0] ?? 20, dims[0] ?? 20] : [dims[0] ?? 26, dims[1] ?? 16, dims[2] ?? 14];
    const v = (x: number, y: number, z: number) => projeter([x, y, z]);
    const [a, b, c, d] = [v(0, 0, 0), v(l, 0, 0), v(l, 0, h), v(0, 0, h)];
    const [e, f, g, hh] = [v(0, p, 0), v(l, p, 0), v(l, p, h), v(0, p, h)];
    points = [a, b, c, d, e, f, g, hh];
    corps = surface([a, b, c, d], FACE.devant) + surface([d, c, g, hh], FACE.dessus) + surface([b, f, g, c], FACE.droite)
      + [arete(a, b), arete(b, c), arete(c, d), arete(d, a), arete(d, hh), arete(c, g), arete(b, f), arete(hh, g), arete(g, f)].join("")
      + (cachees ? arete(e, f, true) + arete(e, hh, true) + arete(e, a, true) : "");
  } else if (s === "pyramide" || s === "pyramide à base triangulaire") {
    const a = dims[0] ?? 24, h = dims[1] ?? 26;
    // Vue de devant, à droite, d'en haut. La base carrée : son coin du fond à gauche est caché, et les trois arêtes qui y mènent.
    // La base triangulaire, posée une pointe en avant : deux faces se voient, seule l'arête du fond de la base est cachée.
    const carre = s === "pyramide";
    const base: P3[] = carre ? [[0, 0, 0], [a, 0, 0], [a, a, 0], [0, a, 0]] : [[0, a * 0.25, 0], [a * 0.6, 0, 0], [a, a * 0.7, 0]];
    const cachees3: [number, number][] = carre ? [[2, 3], [3, 0]] : [[2, 0]];
    const cachesAuSommet = carre ? [3] : [];
    const cx = base.reduce((t, q) => t + q[0], 0) / base.length, cy = base.reduce((t, q) => t + q[1], 0) / base.length;
    const sommet = projeter([cx, cy, h]);
    const b2 = base.map(projeter);
    points = [...b2, sommet];
    const estCachee = (i: number, j: number) => cachees3.some(([x, y]) => (x === i && y === j) || (x === j && y === i));
    corps = surface([b2[0], b2[1], sommet], FACE.devant) + surface([b2[1], b2[2], sommet], FACE.droite)
      + b2.map((q, i) => { const j = (i + 1) % b2.length; return estCachee(i, j) ? (cachees ? arete(q, b2[j], true) : "") : arete(q, b2[j]); }).join("")
      + b2.map((q, i) => (cachesAuSommet.includes(i) ? (cachees ? arete(q, sommet, true) : "") : arete(q, sommet))).join("");
  } else if (s === "cylindre" || s === "cône") {
    const r = dims[0] ?? 12, h = dims[1] ?? 24, ry = r * 0.35;
    points = [[-r, ry], [r, ry], [-r, -h - ry], [r, -h - ry]];
    const bas = `M${-r} 0 A${r} ${f2(ry)} 0 0 0 ${r} 0`, basArriere = `M${-r} 0 A${r} ${f2(ry)} 0 0 1 ${r} 0`;
    if (s === "cylindre") {
      corps = `<path d="M${-r} ${-h} L${-r} 0 A${r} ${f2(ry)} 0 0 0 ${r} 0 L${r} ${-h} Z" fill="${FACE.devant}" stroke="none"/>`
        + `<ellipse cx="0" cy="${-h}" rx="${r}" ry="${f2(ry)}" fill="${FACE.dessus}" stroke="${NOIR}" stroke-width="0.6"/>`
        + `<path d="${bas}" fill="none" stroke="${NOIR}" stroke-width="0.6"/>` + (cachees ? `<path d="${basArriere}" fill="none" stroke="${NOIR}" stroke-width="0.4" stroke-dasharray="1.6 1.2"/>` : "")
        + arete([-r, 0], [-r, -h]) + arete([r, 0], [r, -h]);
    } else {
      corps = `<path d="M${-r} 0 A${r} ${f2(ry)} 0 0 0 ${r} 0 L0 ${-h} Z" fill="${FACE.devant}" stroke="none"/>`
        + `<path d="${bas}" fill="none" stroke="${NOIR}" stroke-width="0.6"/>` + (cachees ? `<path d="${basArriere}" fill="none" stroke="${NOIR}" stroke-width="0.4" stroke-dasharray="1.6 1.2"/>` : "")
        + arete([-r, 0], [0, -h]) + arete([r, 0], [0, -h]);
    }
  } else {
    const r = dims[0] ?? 15;
    points = [[-r, -r], [r, r]];
    corps = `<circle cx="0" cy="0" r="${r}" fill="${FACE.devant}" stroke="${NOIR}" stroke-width="0.6"/>`
      + `<ellipse cx="${f2(-r * 0.3)}" cy="${f2(-r * 0.35)}" rx="${f2(r * 0.28)}" ry="${f2(r * 0.18)}" fill="#fff" opacity="0.7"/>`
      + `<path d="M${-r} 0 A${r} ${f2(r * 0.3)} 0 0 0 ${r} 0" fill="none" stroke="${NOIR}" stroke-width="0.4"/>`
      + (cachees ? `<path d="M${-r} 0 A${r} ${f2(r * 0.3)} 0 0 1 ${r} 0" fill="none" stroke="${NOIR}" stroke-width="0.35" stroke-dasharray="1.6 1.2"/>` : "");
  }
  const xs = points.map((q) => q[0]), ys = points.map((q) => q[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return `<svg class="so-solide" viewBox="-20 -20 40 40" width="${mm}mm" height="${mm}mm"><g transform="translate(${f2(-cx)} ${f2(-cy)})">${corps}</g></svg>`;
}

/** Des dimensions au hasard : des cubes de tailles différentes, des pavés plats ou hauts, des cylindres et des cônes larges ou élancés. */
export function dimensionsAuHasard(alea: () => number, s: Solide): number[] {
  if (s === "cube") return [entre(alea, 14, 22)];
  if (s === "pavé") return alea() < 0.5 ? [entre(alea, 24, 30), entre(alea, 10, 16), entre(alea, 8, 12)] : [entre(alea, 12, 16), entre(alea, 10, 14), entre(alea, 22, 28)];
  if (s === "cylindre" || s === "cône") return [entre(alea, 9, 14), entre(alea, 14, 26)];
  if (s === "pyramide" || s === "pyramide à base triangulaire") return [entre(alea, 20, 26), entre(alea, 20, 28)];
  return [entre(alea, 11, 16)];
}

/** Les solides que chaque classe reconnaît. */
export const SOLIDES_DE_LA_CLASSE: Record<Classe, Solide[]> = {
  CP: ["cube", "pavé", "boule", "cylindre", "cône"],
  CE1: ["cube", "pavé", "boule", "cylindre", "cône", "pyramide"],
  CE2: ["cube", "pavé", "boule", "cylindre", "cône", "pyramide", "pyramide à base triangulaire"],
};

/** Le nom à écrire : une pyramide reste une pyramide, quelle que soit sa base. */
export const nomASavoir = (s: Solide) => (s === "pyramide à base triangulaire" ? "pyramide" : s);

function feuilleNommer(r: ReglagesSolides, graine: number): string {
  const alea = hasard(graine);
  const solides = SOLIDES_DE_LA_CLASSE[r.classe];
  const combien = Math.max(solides.length, Math.min(16, r.combien));
  const liste = melanger(alea, Array.from({ length: combien }, (_, i) => solides[i % solides.length])).map((s) => ({ s, dims: dimensionsAuHasard(alea, s) }));
  const carte = (x: (typeof liste)[number], i: number, corrige: boolean) => `<div class="so-carte"><b class="so-lettre">${LETTRES[i]}</b>${solideSvg(x.s, x.dims, r.cachees)}
    <div class="so-legende">${corrige ? nomASavoir(x.s) : r.classe === "CP" ? "" : "………………………"}</div></div>`;
  const consigne = r.classe === "CP"
    ? "Colorie les cubes en bleu, les pavés en vert, les boules en rouge. Entoure les cylindres et les cônes. Attention : un cube n'est pas un pavé !"
    : `Écris le nom de chaque solide : ${[...new Set(solides.map(nomASavoir))].join(", ")}.${r.cachees ? " Les arêtes cachées sont en pointillés." : ""}`;
  return `<div class="page">${entete("Reconnaître les solides", consigne)}<div class="so-cartes">${liste.map((x, i) => carte(x, i, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">Reconnaître les solides — corrigé</div><div class="so-cartes">${liste.map((x, i) => carte(x, i, true)).join("")}</div></div>`;
}

/** Des objets de tous les jours et la forme de solide qu'ils ont : « une boite à chaussures a la forme d'un pavé, une boite de conserve […] d'un cylindre, une balle de tennis […] d'une boule ». */
export const OBJETS: { objet: string; solide: Solide; classe: Classe }[] = [
  { objet: "une boîte à chaussures", solide: "pavé", classe: "CP" }, { objet: "une boîte de conserve", solide: "cylindre", classe: "CP" },
  { objet: "une balle de tennis", solide: "boule", classe: "CP" }, { objet: "un dé", solide: "cube", classe: "CP" },
  { objet: "un cornet de glace", solide: "cône", classe: "CP" }, { objet: "une brique de lait", solide: "pavé", classe: "CP" },
  { objet: "une orange", solide: "boule", classe: "CP" }, { objet: "un rouleau d'essuie-tout", solide: "cylindre", classe: "CP" },
  { objet: "un morceau de sucre", solide: "cube", classe: "CP" }, { objet: "un chapeau de clown", solide: "cône", classe: "CP" },
  { objet: "la pyramide du Louvre", solide: "pyramide", classe: "CE1" }, { objet: "une pyramide d'Égypte", solide: "pyramide", classe: "CE1" },
];

function feuilleObjets(r: ReglagesSolides, graine: number): string {
  const alea = hasard(graine);
  const rang: Record<Classe, number> = { CP: 0, CE1: 1, CE2: 2 };
  const objets = melanger(alea, OBJETS.filter((o) => rang[o.classe] <= rang[r.classe])).slice(0, Math.max(4, Math.min(10, r.combien)));
  const solides = [...new Set(SOLIDES_DE_LA_CLASSE[r.classe].map(nomASavoir))] as Solide[];
  const gauche = objets.map((o) => `<div class="so-objet"><span>${o.objet}</span><span class="so-point"></span></div>`).join("");
  const droite = solides.map((s) => `<div class="so-forme"><span class="so-point"></span>${solideSvg(s, [], false, 24)}<span>${r.classe === "CP" ? "" : s}</span></div>`).join("");
  return `<div class="page">${entete("Les objets et leur forme", "Relie chaque objet au solide qui a la même forme. Plusieurs objets peuvent avoir la même forme.")}<div class="so-relier"><div>${gauche}</div><div></div><div>${droite}</div></div></div>
    <div class="page corrige"><div class="titre">Les objets et leur forme — corrigé</div><div class="so-corrige">${objets.map((o) => `<div>${o.objet} : <b>${nomASavoir(o.solide)}</b></div>`).join("")}</div></div>`;
}

/** Les faces, les sommets et les arêtes des polyèdres connus. */
export const POLYEDRES: { s: Solide; nom: string; faces: number; nature: string; sommets: number; aretes: number }[] = [
  { s: "cube", nom: "le cube", faces: 6, nature: "6 carrés", sommets: 8, aretes: 12 },
  { s: "pavé", nom: "le pavé", faces: 6, nature: "des rectangles (parfois deux carrés)", sommets: 8, aretes: 12 },
  { s: "pyramide", nom: "la pyramide à base carrée", faces: 5, nature: "1 carré et 4 triangles", sommets: 5, aretes: 8 },
  { s: "pyramide à base triangulaire", nom: "la pyramide à base triangulaire", faces: 4, nature: "4 triangles", sommets: 4, aretes: 6 },
];

function feuilleDenombrer(r: ReglagesSolides): string {
  const liste = POLYEDRES.filter((p) => r.classe === "CE2" || p.s !== "pyramide à base triangulaire");
  const ligne = (p: (typeof liste)[number], corrige: boolean) => `<tr><td>${solideSvg(p.s, [], r.cachees, 26)}<div>${p.nom}</div></td>${[p.faces, p.nature, p.sommets, p.aretes].map((x) => `<td>${corrige ? `<b>${x}</b>` : ""}</td>`).join("")}</tr>`;
  const tableau = (corrige: boolean) => `<table class="so-tableau"><tr><th>Le solide</th><th>Nombre de faces</th><th>Les faces sont…</th><th>Nombre de sommets</th><th>Nombre d'arêtes</th></tr>${liste.map((p) => ligne(p, corrige)).join("")}</table>`;
  return `<div class="page">${entete("Faces, sommets, arêtes", "Prends chaque solide dans tes mains. Compte ses faces, ses sommets et ses arêtes — marque d'une gommette ce que tu as déjà compté —, et dis la forme de ses faces.")}${tableau(false)}</div>
    <div class="page corrige"><div class="titre">Faces, sommets, arêtes — corrigé</div>${tableau(true)}</div>`;
}

/** Les devinettes du jeu du portrait. */
export const PORTRAITS: { devinette: string; s: Solide; classe: Classe }[] = [
  { devinette: "J'ai six faces, et ce sont toutes des carrés.", s: "cube", classe: "CE1" },
  { devinette: "J'ai six faces : des rectangles, parfois aussi deux carrés.", s: "pavé", classe: "CE1" },
  { devinette: "Je n'ai aucune face plane. Je roule dans tous les sens.", s: "boule", classe: "CE1" },
  { devinette: "J'ai deux faces planes qui sont des disques, et je roule.", s: "cylindre", classe: "CE1" },
  { devinette: "J'ai une seule face plane, un disque, et une pointe.", s: "cône", classe: "CE1" },
  { devinette: "Ma base est un carré ; mes quatre autres faces sont des triangles qui se rejoignent en un sommet.", s: "pyramide", classe: "CE1" },
  { devinette: "J'ai cinq sommets et huit arêtes.", s: "pyramide", classe: "CE1" },
  { devinette: "J'ai huit sommets, douze arêtes, et toutes mes arêtes ont la même longueur.", s: "cube", classe: "CE1" },
  { devinette: "Toutes mes faces sont des triangles : il y en a quatre.", s: "pyramide à base triangulaire", classe: "CE2" },
];

function feuillePortrait(r: ReglagesSolides, graine: number): string {
  const alea = hasard(graine);
  const liste = melanger(alea, PORTRAITS.filter((p) => r.classe === "CE2" || p.classe !== "CE2")).slice(0, Math.max(3, Math.min(9, r.combien)));
  const banque = SOLIDES_DE_LA_CLASSE[r.classe === "CP" ? "CE1" : r.classe].map((s, i) => `<div class="so-carte so-petite"><b class="so-lettre">${LETTRES[i]}</b>${solideSvg(s, [], r.cachees, 22)}</div>`).join("");
  const lettreDe = (s: Solide) => LETTRES[SOLIDES_DE_LA_CLASSE[r.classe === "CP" ? "CE1" : r.classe].indexOf(s)];
  const lignes = liste.map((p, i) => `<div class="so-devinette"><b>${i + 1}.</b> ${p.devinette} Qui suis-je ? <span class="so-blanc"></span></div>`).join("");
  return `<div class="page">${entete("Le jeu du portrait : qui suis-je ?", "Lis chaque devinette et trouve le solide : écris sa lettre, ou son nom. Vérifie avec les vrais solides.")}<div class="so-banque">${banque}</div>${lignes}</div>
    <div class="page corrige"><div class="titre">Qui suis-je ? — corrigé</div><div class="so-corrige">${liste.map((p, i) => `<div>${i + 1}. <b>${lettreDe(p.s)} — ${nomASavoir(p.s)}</b></div>`).join("")}</div></div>`;
}

/** Des rangées de quatre solides, dont un intrus, et la raison. */
export const INTRUS: { solides: Solide[]; intrus: number; raison: string }[] = [
  { solides: ["cube", "pavé", "pyramide", "boule"], intrus: 3, raison: "la boule n'a pas de face plane ; elle roule" },
  { solides: ["cylindre", "boule", "cube", "cône"], intrus: 2, raison: "le cube ne roule pas : toutes ses faces sont planes" },
  { solides: ["cube", "pavé", "cylindre", "pyramide"], intrus: 2, raison: "le cylindre a une surface courbe ; les autres n'ont que des faces planes" },
  { solides: ["cube", "cube", "pavé", "cube"], intrus: 2, raison: "le pavé n'a pas que des faces carrées" },
  { solides: ["pyramide", "pyramide", "cône", "pyramide"], intrus: 2, raison: "le cône a une base qui est un disque, et il roule" },
  { solides: ["pavé", "cube", "pavé", "pavé"], intrus: 1, raison: "le cube a six faces carrées, de même taille" },
];

function feuilleIntrus(r: ReglagesSolides, graine: number): string {
  const alea = hasard(graine);
  const liste = melanger(alea, INTRUS.filter((x) => r.classe !== "CP" || !x.solides.includes("pyramide"))).slice(0, Math.max(2, Math.min(6, r.combien)))
    .map((x) => ({ ...x, dims: x.solides.map((s) => dimensionsAuHasard(alea, s)) }));
  const rangee = (x: (typeof liste)[number], i: number, corrige: boolean) => `<div class="so-rangee"><b class="so-lettre">${i + 1}.</b>${x.solides.map((s, k) => `<div class="so-intrus${corrige && k === x.intrus ? " so-barre" : ""}">${solideSvg(s, x.dims[k], r.cachees, 28)}</div>`).join("")}
    <div class="so-raison">${corrige ? x.raison : "Pourquoi ? ……………………………………………"}</div></div>`;
  return `<div class="page">${entete("Cherche l'intrus", "Dans chaque rangée, un solide n'est pas comme les autres. Barre-le, et dis pourquoi : ses faces, ses sommets, roule-t-il ?")}${liste.map((x, i) => rangee(x, i, false)).join("")}</div>
    <div class="page corrige"><div class="titre">Cherche l'intrus — corrigé</div>${liste.map((x, i) => rangee(x, i, true)).join("")}</div>`;
}

// ── Les patrons du cube (CE2) ─────────────────────────────────────────────

export type Case = [number, number];

/**
 * Un assemblage de six carrés est-il un patron du cube ? On fait rouler un
 * cube sur l'assemblage : chaque carré reçoit la face du cube qui vient s'y
 * poser. Six faces différentes : c'est un patron.
 */
export function estUnPatronDuCube(cases: Case[]): boolean {
  if (cases.length !== 6) return false;
  type Cube = { bas: string; haut: string; nord: string; sud: string; est: string; ouest: string };
  const rouler = (c: Cube, d: "est" | "ouest" | "nord" | "sud"): Cube => (d === "est" ? { ...c, bas: c.est, est: c.haut, haut: c.ouest, ouest: c.bas }
    : d === "ouest" ? { ...c, bas: c.ouest, ouest: c.haut, haut: c.est, est: c.bas }
      : d === "nord" ? { ...c, bas: c.nord, nord: c.haut, haut: c.sud, sud: c.bas }
        : { ...c, bas: c.sud, sud: c.haut, haut: c.nord, nord: c.bas });
  const cle = (c: Case) => `${c[0]},${c[1]}`;
  const ici = new Set(cases.map(cle));
  const vu = new Map<string, Cube>([[cle(cases[0]), { bas: "1", haut: "6", nord: "2", sud: "5", est: "3", ouest: "4" }]]);
  const file: Case[] = [cases[0]];
  while (file.length) {
    const c = file.shift()!;
    const cube = vu.get(cle(c))!;
    for (const [d, dx, dy] of [["est", 1, 0], ["ouest", -1, 0], ["nord", 0, -1], ["sud", 0, 1]] as const) {
      const v: Case = [c[0] + dx, c[1] + dy];
      if (ici.has(cle(v)) && !vu.has(cle(v))) { vu.set(cle(v), rouler(cube, d)); file.push(v); }
    }
  }
  return vu.size === 6 && new Set([...vu.values()].map((c) => c.bas)).size === 6;
}

/** Un assemblage ramené en haut à gauche, dans une forme canonique (à rotation et retournement près). */
const normaliser = (cases: Case[]): Case[] => { const mx = Math.min(...cases.map((c) => c[0])), my = Math.min(...cases.map((c) => c[1])); return cases.map(([x, y]) => [x - mx, y - my] as Case).sort((a, b) => a[1] - b[1] || a[0] - b[0]); };
const canonique = (cases: Case[]) => {
  const formes: Case[][] = [];
  let c = cases;
  for (let k = 0; k < 4; k++) { c = c.map(([x, y]) => [y, -x] as Case); formes.push(normaliser(c), normaliser(c.map(([x, y]) => [-x, y] as Case))); }
  return formes.map((f) => JSON.stringify(f)).sort()[0];
};

/** Des assemblages de six carrés tirés au hasard, différents, la moitié des patrons du cube ; 4 carreaux sur 3 au plus. */
export function assemblagesDeSixCarres(alea: () => number, combien: number): { cases: Case[]; patron: boolean }[] {
  const patrons: Case[][] = [], autres: Case[][] = [];
  const vus = new Set<string>();
  for (let garde = 0; garde < 4000 && (patrons.length < combien || autres.length < combien); garde++) {
    const cases: Case[] = [[0, 0]];
    while (cases.length < 6) {
      const [x, y] = cases[Math.floor(alea() * cases.length)];
      const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(alea() * 4)];
      if (!cases.some((c) => c[0] === x + dx && c[1] === y + dy)) cases.push([x + dx, y + dy]);
    }
    const n = normaliser(cases);
    const w = Math.max(...n.map((c) => c[0])) + 1, h = Math.max(...n.map((c) => c[1])) + 1;
    if (Math.max(w, h) > 4 || Math.min(w, h) > 3) continue;
    const k = canonique(n);
    if (vus.has(k)) continue;
    vus.add(k);
    (estUnPatronDuCube(n) ? patrons : autres).push(n);
  }
  const moitie = Math.ceil(combien / 2);
  return melanger(alea, [...patrons.slice(0, moitie).map((cases) => ({ cases, patron: true })), ...autres.slice(0, combien - moitie).map((cases) => ({ cases, patron: false }))]);
}

const assemblageSvg = (cases: Case[], c: number, marque = "") => {
  const w = Math.max(...cases.map((q) => q[0])) + 1, h = Math.max(...cases.map((q) => q[1])) + 1;
  return `<svg viewBox="-1 -1 ${w * c + 2} ${h * c + 2}" width="${w * c + 2}mm" height="${h * c + 2}mm">${cases.map(([x, y]) => `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}" fill="${marque || "#eef3fb"}" stroke="${NOIR}" stroke-width="0.5"/>`).join("")}</svg>`;
};

function feuillePatrons(r: ReglagesSolides, graine: number): string {
  const alea = hasard(graine);
  const liste = assemblagesDeSixCarres(alea, Math.max(2, Math.min(8, r.combien < 4 ? 6 : r.combien)));
  const carte = (a: (typeof liste)[number], i: number, corrige: boolean) => `<div class="so-patron"><b class="so-lettre">${LETTRES[i]}</b>${assemblageSvg(a.cases, 13)}
    <div class="so-legende">${corrige ? `<b>${a.patron ? "oui, c'est un patron du cube" : "non"}</b>` : "Patron du cube ? &nbsp; oui &nbsp;·&nbsp; non"}</div></div>`;
  return `<div class="page">${entete("Est-ce un patron du cube ?", "Six carrés, mais pas toujours un patron ! Imagine le pliage : deux carrés ne doivent pas venir sur la même face. Entoure oui ou non, puis découpe l'assemblage et plie-le pour vérifier.")}<div class="so-patrons">${liste.map((a, i) => carte(a, i, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">Est-ce un patron du cube ? — corrigé</div><div class="so-patrons">${liste.map((a, i) => carte(a, i, true)).join("")}</div></div>`;
}

/** Le patron du cube en croix, à grands carreaux, avec ses languettes de collage. */
function feuillePatronCube(): string {
  const c = 36;
  const cases: Case[] = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];
  const carres = cases.map(([x, y]) => `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}" fill="#eef3fb" stroke="${NOIR}" stroke-width="0.6"/>`).join("");
  // Les languettes sur les bords libres, de quoi coller sept arêtes.
  const languette = (x1: number, y1: number, x2: number, y2: number, nx: number, ny: number) => {
    const p = 7, r = 0.22;
    const a: P = [x1 + (x2 - x1) * r + nx * p, y1 + (y2 - y1) * r + ny * p], b: P = [x2 - (x2 - x1) * r + nx * p, y2 - (y2 - y1) * r + ny * p];
    return `<path d="M${x1} ${y1} L${f2(a[0])} ${f2(a[1])} L${f2(b[0])} ${f2(b[1])} L${x2} ${y2}" fill="#fff8e1" stroke="#9aa0b4" stroke-width="0.4" stroke-dasharray="1.5 1"/>`;
  };
  const tabs = [
    languette(c, 0, 2 * c, 0, 0, -1), languette(2 * c, 0, 2 * c, c, 1, 0), languette(0, c, c, c, 0, -1), languette(0, 2 * c, c, 2 * c, 0, 1),
    languette(2 * c, 2 * c, 3 * c, 2 * c, 0, 1), languette(3 * c, c, 4 * c, c, 0, -1), languette(4 * c, c, 4 * c, 2 * c, 1, 0),
  ].join("");
  return `<div class="page">${entete("Construire un cube à partir de son patron", "Découpe le patron en suivant le contour, languettes comprises. Plie sur chaque trait, colle les languettes à l'intérieur : tu obtiens un cube. Combien a-t-il de faces ? de sommets ? d'arêtes ?")}
    <div class="so-grand"><svg viewBox="-10 -10 ${4 * c + 20} ${3 * c + 20}" width="${4 * c + 20}mm" height="${3 * c + 20}mm">${tabs}${carres}</svg></div></div>`;
}

/** Les faces d'un solide, à découper et à assembler avec du ruban adhésif. */
function feuilleFaces(r: ReglagesSolides): string {
  const rect = (l: number, h: number, quoi: string) => `<div class="so-face"><svg viewBox="-1 -1 ${l + 2} ${h + 2}" width="${l + 2}mm" height="${h + 2}mm"><rect x="0" y="0" width="${l}" height="${h}" fill="#eef3fb" stroke="${NOIR}" stroke-width="0.5"/></svg><span>${quoi}</span></div>`;
  const tri = (b: number, h: number) => `<div class="so-face"><svg viewBox="-1 -1 ${b + 2} ${h + 2}" width="${b + 2}mm" height="${h + 2}mm"><path d="M0 ${h} L${b} ${h} L${b / 2} 0 Z" fill="#eef3fb" stroke="${NOIR}" stroke-width="0.5"/></svg><span>triangle</span></div>`;
  const faces = r.solide === "cube" ? Array.from({ length: 6 }, () => rect(45, 45, "carré"))
    : r.solide === "pavé" ? [rect(60, 30, "rectangle"), rect(60, 30, "rectangle"), rect(60, 40, "rectangle"), rect(60, 40, "rectangle"), rect(40, 30, "rectangle"), rect(40, 30, "rectangle")]
      : [rect(50, 50, "carré, la base"), tri(50, 55), tri(50, 55), tri(50, 55), tri(50, 55)];
  const nom = r.solide === "cube" ? "un cube" : r.solide === "pavé" ? "un pavé" : "une pyramide à base carrée";
  return `<div class="page">${entete(`Les faces d'${nom}`, `Découpe les faces, puis assemble-les avec du ruban adhésif pour construire ${nom}, en regardant le modèle. Combien de faces ? Quelle est leur forme ?`)}
    <div class="so-faces">${faces.join("")}</div></div>`;
}

// ── Les assemblages de cubes (CP, CE1) ────────────────────────────────────

/** Un assemblage : des cubes, chacun à sa place (x vers la droite, y vers le fond, z vers le haut). */
export type Assemblage = P3[];

/**
 * Les assemblages à construire : en une seule rangée au CP, sur deux rangées
 * au CE1. Chaque cube montre au moins une face : aucun n'est caché.
 */
export const ASSEMBLAGES: Record<"CP" | "CE1", Assemblage[]> = {
  CP: [
    [[0, 0, 0], [1, 0, 0], [2, 0, 0]],
    [[0, 0, 0], [0, 0, 1], [0, 0, 2]],
    [[0, 0, 0], [1, 0, 0], [1, 0, 1]],
    [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 0, 1]],
    [[0, 0, 0], [1, 0, 0], [1, 0, 1], [2, 0, 0], [2, 0, 1], [2, 0, 2]],
    [[0, 0, 0], [0, 0, 1], [1, 0, 0], [2, 0, 0], [2, 0, 1]],
    [[0, 0, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [0, 0, 1], [3, 0, 1]],
  ],
  CE1: [
    [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]],
    [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 1, 1]],
    [[0, 1, 0], [0, 1, 1], [1, 1, 0], [1, 1, 1], [1, 0, 0]],
    [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0], [0, 1, 1], [0, 1, 2]],
    [[0, 1, 0], [1, 1, 0], [2, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 0, 0], [1, 1, 0], [1, 1, 1], [2, 1, 0], [2, 1, 1], [2, 1, 2]],
    [[0, 0, 0], [0, 1, 0], [1, 1, 0], [2, 1, 0], [2, 0, 0], [1, 1, 1]],
    [[1, 0, 0], [0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1], [0, 1, 2]],
  ],
};

/** Chaque cube montre au moins sa face de devant, de dessus ou de droite : rien ne le recouvre de ce côté. */
export function aucunCubeCache(a: Assemblage): boolean {
  const ici = (x: number, y: number, z: number) => a.some((c) => c[0] === x && c[1] === y && c[2] === z);
  return a.every(([x, y, z]) => !ici(x, y, z + 1) || !ici(x + 1, y, z) || !a.some((c) => c[0] === x && c[2] === z && c[1] < y));
}

/** L'assemblage dessiné en perspective cavalière, du fond vers le devant, du bas vers le haut, de gauche à droite. */
export function assemblageCubesSvg(a: Assemblage, cote = 9): string {
  const ordre = [...a].sort((p, q) => q[1] - p[1] || p[2] - q[2] || p[0] - q[0]);
  const v = (x: number, y: number, z: number) => projeter([x * cote, y * cote, z * cote]);
  let corps = "";
  for (const [x, y, z] of ordre) {
    const [p0, p1, p2, p3] = [v(x, y, z), v(x + 1, y, z), v(x + 1, y, z + 1), v(x, y, z + 1)];
    const [q1, q2, q3] = [v(x + 1, y + 1, z), v(x + 1, y + 1, z + 1), v(x, y + 1, z + 1)];
    const face = (pts: P[], fond: string) => `<path d="M${pts.map((p) => `${f2(p[0])} ${f2(p[1])}`).join(" L")} Z" fill="${fond}" stroke="${NOIR}" stroke-width="0.45" stroke-linejoin="round"/>`;
    corps += face([p0, p1, p2, p3], FACE.devant) + face([p3, p2, q2, q3], FACE.dessus) + face([p1, q1, q2, p2], FACE.droite);
  }
  const tous = a.flatMap(([x, y, z]) => [v(x, y, z), v(x + 1, y + 1, z + 1), v(x + 1, y, z), v(x, y + 1, z + 1)]);
  const minX = Math.min(...tous.map((p) => p[0])) - 1, maxX = Math.max(...tous.map((p) => p[0])) + 1;
  const minY = Math.min(...tous.map((p) => p[1])) - 1, maxY = Math.max(...tous.map((p) => p[1])) + 1;
  return `<svg class="so-assemblage" viewBox="${f2(minX)} ${f2(minY)} ${f2(maxX - minX)} ${f2(maxY - minY)}" width="${f2(maxX - minX)}mm" height="${f2(maxY - minY)}mm">${corps}</svg>`;
}

function feuilleAssemblages(r: ReglagesSolides, graine: number): string {
  const alea = hasard(graine);
  const classe = r.classe === "CP" ? "CP" : "CE1";
  const liste = melanger(alea, ASSEMBLAGES[classe]).slice(0, Math.max(2, Math.min(8, r.combien < 4 ? 6 : r.combien)));
  const carte = (a: Assemblage, i: number, corrige: boolean) => `<div class="so-patron"><b class="so-lettre">${LETTRES[i]}</b>${assemblageCubesSvg(a)}
    <div class="so-legende">${corrige ? `<b>${a.length} cubes</b>` : "Combien de cubes ? ……"}</div></div>`;
  return `<div class="page">${entete("Construire des assemblages de cubes", "Construis chaque modèle avec tes cubes, puis pose ta construction à côté du dessin pour comparer. Combien de cubes as-tu utilisés ? Aucun cube n'est caché.")}<div class="so-patrons">${liste.map((a, i) => carte(a, i, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">Les assemblages de cubes — corrigé</div><div class="so-patrons">${liste.map((a, i) => carte(a, i, true)).join("")}</div></div>`;
}

export function htmlSolides(r: ReglagesSolides, graine: number): string {
  const corps = r.exercice === "objets" ? feuilleObjets(r, graine)
    : r.exercice === "denombrer" ? feuilleDenombrer(r)
      : r.exercice === "portrait" ? feuillePortrait(r, graine)
        : r.exercice === "intrus" ? feuilleIntrus(r, graine)
          : r.exercice === "patrons" ? feuillePatrons(r, graine)
            : r.exercice === "patronCube" ? feuillePatronCube()
              : r.exercice === "faces" ? feuilleFaces(r)
                : r.exercice === "assemblages" ? feuilleAssemblages(r, graine)
                  : feuilleNommer(r, graine);
  return feuille(corps, "so");
}

export const STYLE_SOLIDES = `
  .feuille.so svg { display: block; }
  .feuille.so .so-lettre { font-size: 13px; font-weight: 800; }
  .feuille.so .so-cartes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }
  .feuille.so .so-carte { border: 1px dashed #c4c9d6; border-radius: 3mm; padding: 1.5mm; display: flex; flex-direction: column; align-items: center; page-break-inside: avoid; break-inside: avoid; }
  .feuille.so .so-carte > .so-lettre { align-self: flex-start; }
  .feuille.so .so-petite { padding: 1mm; }
  .feuille.so .so-legende { font-size: 12px; text-align: center; min-height: 16px; margin-top: 1mm; }
  .feuille.so .so-relier { display: grid; grid-template-columns: 1fr 24mm 1fr; align-items: start; margin-top: 3mm; }
  .feuille.so .so-objet { display: flex; justify-content: flex-end; align-items: center; gap: 3mm; font-size: 15px; font-weight: 600; height: 13mm; }
  .feuille.so .so-forme { display: flex; align-items: center; gap: 3mm; font-size: 14px; height: 26mm; }
  .feuille.so .so-point { display: inline-block; width: 3mm; height: 3mm; border-radius: 50%; background: #1c2233; flex: none; }
  .feuille.so .so-tableau { width: 100%; border-collapse: collapse; font-size: 13px; }
  .feuille.so .so-tableau th, .feuille.so .so-tableau td { border: 1px solid #9aa0b4; padding: 2mm; text-align: center; vertical-align: middle; }
  .feuille.so .so-tableau td:first-child { width: 34mm; }
  .feuille.so .so-tableau td:first-child svg { margin: 0 auto; }
  .feuille.so .so-tableau tr { height: 30mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.so .so-banque { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2mm; margin-bottom: 5mm; }
  .feuille.so .so-devinette { font-size: 14px; line-height: 2.1; margin-bottom: 2mm; }
  .feuille.so .so-blanc { display: inline-block; width: 30mm; height: 6mm; border-bottom: 2px dotted #1c2233; }
  .feuille.so .so-rangee { display: grid; grid-template-columns: 7mm repeat(4, 1fr); align-items: center; gap: 2mm; margin-bottom: 4mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.so .so-intrus { display: flex; justify-content: center; position: relative; }
  .feuille.so .so-barre::after { content: ""; position: absolute; left: 10%; right: 10%; top: 50%; border-top: 2.5px solid #d33a32; transform: rotate(-30deg); }
  .feuille.so .so-raison { grid-column: 2 / -1; font-size: 13px; }
  .feuille.so .so-patrons { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .feuille.so .so-patron { border: 1px dashed #c4c9d6; border-radius: 3mm; padding: 2.5mm; display: flex; flex-direction: column; align-items: center; gap: 2mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.so .so-patron > .so-lettre { align-self: flex-start; }
  .feuille.so .so-grand { display: flex; justify-content: center; margin-top: 8mm; }
  .feuille.so .so-faces { display: block; line-height: 0; }
  .feuille.so .so-face { display: inline-flex; flex-direction: column; align-items: center; gap: 1mm; margin: 0 5mm 5mm 0; vertical-align: top; line-height: 1.2; font-size: 10px; color: #687087; }
  .feuille.so .so-corrige { font-size: 13px; line-height: 1.8; }
`;
