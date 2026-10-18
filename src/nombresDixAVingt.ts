// Les feuilles de la séquence « La connaissance des nombres de 10 à 20 »
// (CP), d'après un manuel de préparation au CRPE que l'enseignant a fourni
// (voir demarcheDixAVingt.ts).
//
// La séance 4 du manuel se sert de quatre supports : des cartes de billes
// dispersées à dénombrer, de trois couleurs ; des billes et des calots — un
// calot vaut dix billes — pour savoir qui a gagné la partie ; l'abaque à deux
// tiges, où dix jetons verts s'échangent contre un rouge, posé sur la tige
// des dizaines ; la frise jusqu'à 20 à compléter. Les autres séances gardent
// ce matériel : les nombres jusqu'à 9 et leurs décompositions, le paquet de
// dix, les nombres de 10 à 16, comparer et ranger, l'évaluation. Les nombres
// sont tirés au sort ; le corrigé suit, sur sa page.
//
// La feuille est souvent photocopiée en noir et blanc : une bille garde son
// reflet, le calot est plus gros et porte sa spirale, le jeton rouge a un
// bord épais — et c'est la tige qui dit la dizaine, comme le veut la séance.

import { feuille } from "./cartesImprimables";
import { REGLAGES_CUBES } from "./cubesNumeration";
import { hasard, melanger } from "./hasard";
import { entier } from "./nombres";
import { nombreEnLettres } from "./nombresEnLettres";

export type FeuilleDixAVingt =
  | "jusqua-9" | "paquet-de-dix" | "dix-a-seize" | "billes-dispersees" | "billes-et-calots" | "abaque" | "frise-20" | "comparer-20" | "evaluation";

const NOIR = "#1c2233", BLEU = "#2f6fd1";
interface Couleur { nom: string; hex: string }
const BLEUES: Couleur = { nom: "bleues", hex: "#4a86e8" };
const ROUGES: Couleur = { nom: "rouges", hex: "#e05252" };
const VERTES: Couleur = { nom: "vertes", hex: "#38a169" };
const JETON_ROUGE = "#e05252", JETON_VERT = "#38a169";

const PROGRAMME = '<span class="reference">Programme de mathématiques du cycle 2, 2024.</span>';
const MANUEL = `<span class="reference">D'après Réussir mon CRPE, oral 2025-2026 (Nathan), p. 40-43.</span>`;
const entete = (titre: string, consigne: string, source = PROGRAMME) => `<div class="titre">${titre}</div>
  <div class="sous">Prénom : ........................................ Date : ........................</div>
  <div class="regle">${consigne} ${source}</div>`;
const corrige = (titre: string, corps: string) => `<div class="page corrige"><div class="titre">${titre} — corrigé</div>${corps}</div>`;
const BLANC = '<span class="dv-blanc"></span>';
/** La réponse : un blanc pour l'élève, en gras au corrigé. */
const rep = (corr: boolean, v: string | number) => (corr ? `<b class="dv-rep">${v}</b>` : BLANC);
/**
 * Un exercice : sa consigne, numérotée — elle prend le cadre des consignes
 * (voir consignesStructurees.ts) —, et ce qu'il faut faire, sans saut de page
 * entre les deux.
 */
const exo = (n: number, texte: string, contenu: string) => `<div class="dv-exo"><div class="dv-consigne"><b>${n}.</b> ${texte}</div>${contenu}</div>`;
const n2 = (v: number) => String(Math.round(v * 100) / 100);
/** Un dessin en millimètres ; `echelle` le montre plus petit sans rien changer à ses mesures. */
const svg = (l: number, h: number, corps: string, echelle = 1) =>
  `<svg class="dv-dessin" viewBox="0 0 ${n2(l)} ${n2(h)}" style="width:${n2(l * echelle)}mm;height:${n2(h * echelle)}mm">${corps}</svg>`;
const de = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// ── Les billes et les calots ──────────────────────────────────────────────

/** Une bille : un rond de sa couleur et son reflet ; au corrigé, son rang dans le paquet de dix à la place du reflet. */
function bille(x: number, y: number, r: number, hex: string, rang?: number): string {
  const rond = `<circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" fill="${hex}" stroke="${NOIR}" stroke-width="0.35"/>`;
  return rang
    ? `${rond}<text x="${n2(x)}" y="${n2(y + r * 0.4)}" font-size="${n2(r * 1.1)}" font-weight="800" text-anchor="middle" fill="#fff">${rang}</text>`
    : `${rond}<circle cx="${n2(x - r * 0.35)}" cy="${n2(y - r * 0.35)}" r="${n2(r * 0.28)}" fill="#fff" opacity="0.8"/>`;
}

/** Un calot : une grosse bille dorée, et sa spirale. */
function calot(x: number, y: number, r: number): string {
  const p = (dx: number, dy: number) => `${n2(x + dx * r)} ${n2(y + dy * r)}`;
  return `<circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" fill="#f2c94c" stroke="${NOIR}" stroke-width="0.5"/>`
    + `<path d="M${p(-0.55, 0.2)}C${p(-0.45, -0.55)} ${p(0.45, -0.6)} ${p(0.5, 0)}S${p(0, 0.6)} ${p(-0.15, 0.15)}" fill="none" stroke="#a86b12" stroke-width="0.55"/>`
    + `<circle cx="${n2(x - r * 0.42)}" cy="${n2(y - r * 0.42)}" r="${n2(r * 0.2)}" fill="#fff" opacity="0.85"/>`;
}

interface Point { x: number; y: number }

/**
 * Des points au hasard dans un rectangle — celui des centres —, à `ecart` au
 * moins les uns des autres : une collection qu'on ne compte pas d'un coup
 * d'œil, où aucune bille n'en cache une autre.
 */
function disperser(alea: () => number, n: number, x0: number, x1: number, y0: number, y1: number, ecart: number, voisins: Point[] = []): Point[] {
  for (let essai = 0; essai < 40; essai++) {
    const pts: Point[] = [];
    for (let k = 0; k < 800 && pts.length < n; k++) {
      const p = { x: x0 + alea() * (x1 - x0), y: y0 + alea() * (y1 - y0) };
      if ([...voisins, ...pts].every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= ecart)) pts.push(p);
    }
    if (pts.length === n) return pts;
  }
  // Le hasard n'a pas trouvé de place : une grille.
  const cols = Math.max(1, Math.ceil(Math.sqrt((n * (x1 - x0 + ecart)) / (y1 - y0 + ecart))));
  const rangs = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, i) => ({
    x: x0 + (cols > 1 ? ((i % cols) * (x1 - x0)) / (cols - 1) : (x1 - x0) / 2),
    y: y0 + (rangs > 1 ? (Math.floor(i / cols) * (y1 - y0)) / (rangs - 1) : (y1 - y0) / 2),
  }));
}

/** La marge du trait qui entoure un paquet, autour du centre de ses billes : un rayon, et un peu d'air. */
const margeDuTrait = (r: number) => r + 1.1;

/**
 * Une collection de `n` billes dispersées dans un cadre de `l` sur `h`. Passé
 * dix, les dix premières sont à gauche des autres : le corrigé les entoure
 * d'un trait qui ne doit toucher aucune autre bille. On tire jusqu'à ce que
 * ce soit le cas ; sinon, un écart entre les deux groupes le garantit.
 */
function collection(alea: () => number, n: number, l: number, h: number, r: number): Point[] {
  const ecart = 2 * r + 3.4, m = r + 1.2;
  if (n <= 10) return disperser(alea, n, m, l - m, m, h - m, ecart);
  // Du centre d'une bille au trait : sa marge et son épaisseur ; puis le rayon de l'autre bille, et un millimètre d'air.
  const degage = margeDuTrait(r) + 0.5 + r + 1;
  for (let essai = 0; ; essai++) {
    const fente = essai < 40 ? 0 : degage;
    const limite = m + ((l - 2 * m - fente) * 10) / n;
    const paquet = disperser(alea, 10, m, limite, m, h - m, ecart);
    const autres = disperser(alea, n - 10, limite + fente, l - m, m, h - m, ecart, paquet);
    const tour = enveloppe(paquet);
    if (fente || autres.every((p) => distanceAuPolygone(p, tour) >= degage)) return [...paquet, ...autres];
  }
}

/** L'enveloppe convexe des points (Andrew) : le tour d'un paquet. */
function enveloppe(pts: Point[]): Point[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const croix = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const bas: Point[] = [], haut: Point[] = [];
  for (const q of p) { while (bas.length >= 2 && croix(bas[bas.length - 2], bas[bas.length - 1], q) <= 0) bas.pop(); bas.push(q); }
  for (const q of [...p].reverse()) { while (haut.length >= 2 && croix(haut[haut.length - 2], haut[haut.length - 1], q) <= 0) haut.pop(); haut.push(q); }
  return [...bas.slice(0, -1), ...haut.slice(0, -1)];
}

/** La distance d'un point à un segment. */
function distanceAuSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** La distance d'un point à un polygone convexe : zéro dedans. */
function distanceAuPolygone(p: Point, poly: Point[]): number {
  const cotes = poly.map((a, i) => [a, poly[(i + 1) % poly.length]] as const);
  const signes = cotes.map(([a, b]) => Math.sign((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)));
  if (poly.length >= 3 && (signes.every((x) => x >= 0) || signes.every((x) => x <= 0))) return 0;
  return Math.min(...cotes.map(([a, b]) => distanceAuSegment(p, a, b)));
}

/** L'ordre où l'on compte un paquet : de la bille la plus à gauche, toujours vers la plus proche. */
function chemin(pts: Point[]): Point[] {
  const reste = [...pts].sort((a, b) => a.x - b.x);
  const suite = [reste.shift()!];
  while (reste.length) {
    const d = suite[suite.length - 1];
    let k = 0;
    reste.forEach((q, i) => { if (Math.hypot(q.x - d.x, q.y - d.y) < Math.hypot(reste[k].x - d.x, reste[k].y - d.y)) k = i; });
    suite.push(reste.splice(k, 1)[0]);
  }
  return suite;
}

/** Le trait qui entoure un paquet, comme au crayon : l'enveloppe des billes, élargie d'un rayon et d'un peu d'air. */
function entourer(pts: Point[], marge: number): string {
  const e = enveloppe(pts).map((q) => `${n2(q.x)},${n2(q.y)}`).join(" ");
  return `<polygon points="${e}" fill="#e3edfb" stroke="${BLEU}" stroke-width="${n2(2 * marge + 0.9)}" stroke-linejoin="round"/>`
    + `<polygon points="${e}" fill="#e3edfb" stroke="#e3edfb" stroke-width="${n2(2 * marge)}" stroke-linejoin="round"/>`;
}

/** Une collection dessinée ; au corrigé, passé dix, le paquet de dix entouré, et ses billes numérotées dans l'ordre où on les compte. */
function svgCollection(pts: Point[], l: number, h: number, r: number, hex: string, corr: boolean): string {
  const paquet = corr && pts.length > 10 ? pts.slice(0, 10) : [];
  const rangs = new Map(chemin(paquet).map((p, i) => [p, i + 1]));
  return svg(l, h, (paquet.length ? entourer(paquet, margeDuTrait(r)) : "") + pts.map((p) => bille(p.x, p.y, r, hex, rangs.get(p))).join(""));
}

/** Ce qu'un joueur a gagné : des calots et des billes. */
interface Jeu { calots: number; billes: number }
const valeurDe = (j: Jeu) => 10 * j.calots + j.billes;

/** Les calots d'un joueur, puis ses billes, en ligne ; `parRang` billes au plus par ligne. */
function svgJeu(j: Jeu, parRang = 20, echelle = 1): string {
  const R = 4.4, r = 2.6, pas = 6.3;
  const rangs = Math.max(1, Math.ceil(j.billes / parRang));
  const hBilles = 2 * r + (rangs - 1) * pas;
  // Les billes et les calots, centrés sur la même ligne.
  const h = Math.max(j.calots ? 2 * R : 0, hBilles) + 1.2;
  const morceaux: string[] = [];
  let x = 0.6;
  for (let c = 0; c < j.calots; c++) { morceaux.push(calot(x + R, h / 2, R)); x += 2 * R + 2; }
  const x0 = x + (j.calots ? 1 : 0), y0 = (h - hBilles) / 2 + r;
  for (let k = 0; k < j.billes; k++) morceaux.push(bille(x0 + (k % parRang) * pas + r, y0 + Math.floor(k / parRang) * pas, r, BLEUES.hex));
  const l = j.billes ? x0 + Math.min(j.billes, parRang) * pas : x;
  return svg(l, h, morceaux.join(""), echelle);
}

/** La règle du jeu, dessinée : un calot vaut dix billes. */
function regleDuCalot(): string {
  const r = 2.6, pas = 6.3, R = 4.4;
  const billes = de(0, 9).map((k) => bille(19 + k * pas + r, 5, r, BLEUES.hex)).join("");
  return `<div class="dv-regle-jeu">${svg(19 + 10 * pas + 1, 10, calot(R + 0.6, 5, R) + `<text x="13" y="6.6" font-size="5" font-weight="800" text-anchor="middle" fill="${NOIR}">=</text>` + billes)}<span>Un calot vaut dix billes.</span></div>`;
}

/** Une partie : deux joueurs, A et B, et ce que chacun a gagné. */
type Partie = [Jeu, Jeu];

/**
 * Les parties, de la plus simple à la plus fine : un calot et des billes
 * contre plus de billes que d'objets chez l'autre — le calot gagne quand
 * même —, des billes seules qui l'emportent, deux joueurs qui ont chacun un
 * calot, puis vingt. Qui est A, qui est B : au hasard.
 */
function parties(alea: () => number, combien: number): Partie[] {
  const a = entier(alea, 5, 9);
  const u = entier(alea, 2, 6);
  const [v, w] = melanger(alea, de(1, 9)).slice(0, 2);
  const liste: Partie[] = [
    [{ calots: 1, billes: a }, { calots: 0, billes: 9 + a }],
    [{ calots: 0, billes: 10 + u + entier(alea, 1, 9 - u) }, { calots: 1, billes: u }],
    [{ calots: 1, billes: v }, { calots: 1, billes: w }],
    [{ calots: 2, billes: 0 }, alea() < 0.5 ? { calots: 0, billes: 19 } : { calots: 1, billes: 9 }],
  ];
  return liste.slice(0, combien).map(([x, y]) => (alea() < 0.5 ? [x, y] : [y, x]));
}

const lettre = (l: string, gagne = false) => `<span class="dv-lettre${gagne ? " dv-gagne" : ""}">${l}</span>`;

function htmlPartie(titre: string, [a, b]: Partie, corr: boolean): string {
  const va = valeurDe(a), vb = valeurDe(b);
  return `<div class="dv-partie">${titre ? `<div class="dv-partie-titre">${titre}</div>` : ""}`
    + `<div class="dv-joueur">${lettre("A")}${svgJeu(a)}</div><div class="dv-joueur">${lettre("B")}${svgJeu(b)}</div>`
    + `<div class="dv-ligne">A : ${rep(corr, va)} billes. <span class="dv-espace">B : ${rep(corr, vb)} billes.</span>`
    + `<span class="dv-espace">Le gagnant : ${lettre("A", corr && va > vb)} ${lettre("B", corr && vb > va)}</span></div></div>`;
}

// ── L'abaque à deux tiges ─────────────────────────────────────────────────

type Jeton = "rouge" | "vert";
/** Les jetons d'un nombre jusqu'à 20 : des rouges sur la tige des dizaines, des verts sur celle des unités. */
const jetonsDe = (n: number): [Jeton[], Jeton[]] => [Array<Jeton>(Math.floor(n / 10)).fill("rouge"), Array<Jeton>(n % 10).fill("vert")];
const aucun: [Jeton[], Jeton[]] = [[], []];

/**
 * L'abaque : deux tiges sur un socle, dix jetons au plus sur chacune ; sous
 * le socle, le nom des tiges — les dizaines à gauche, les unités à droite —,
 * sauf avant l'échange, quand dix jetons verts occupent encore une tige.
 */
function svgAbaque([gauche, droite]: [Jeton[], Jeton[]], { etiquettes = true, echelle = 0.8 } = {}): string {
  // Sans les noms des tiges, la même hauteur : deux abaques côte à côte ont leur socle à la même ligne.
  const L = 38, socle = 40, H = 51;
  const tige = (x: number) => `<line x1="${x}" y1="3" x2="${x}" y2="${socle}" stroke="#8a6a3d" stroke-width="1.1" stroke-linecap="round"/>`;
  const jetons = (x: number, liste: Jeton[]) => liste.map((j, k) => `<ellipse cx="${x}" cy="${n2(socle - 2.2 - k * 3.4)}" rx="6.3" ry="1.6" `
    + `fill="${j === "rouge" ? JETON_ROUGE : JETON_VERT}" stroke="${NOIR}" stroke-width="${j === "rouge" ? 0.65 : 0.3}"/>`).join("");
  const noms = etiquettes ? `<text x="10" y="${H - 1}" font-size="3.4" text-anchor="middle" fill="${NOIR}">dizaines</text>`
    + `<text x="28" y="${H - 1}" font-size="3.4" text-anchor="middle" fill="${NOIR}">unités</text>` : "";
  return svg(L, H, tige(10) + tige(28) + jetons(10, gauche) + jetons(28, droite)
    + `<rect x="1" y="${socle}" width="36" height="5" rx="1" fill="#d9b98c" stroke="${NOIR}" stroke-width="0.4"/>` + noms, echelle);
}

/** L'échange, dessiné entre les deux abaques : dix jetons verts, une flèche, un jeton rouge. */
function svgEchange(): string {
  const jeton = (x: number, y: number, hex: string, bord: number) =>
    `<ellipse cx="${x}" cy="${n2(y)}" rx="4.4" ry="1.1" fill="${hex}" stroke="${NOIR}" stroke-width="${bord}"/>`;
  return svg(34, 30, de(0, 9).map((k) => jeton(5.5, 26 - k * 2.3, JETON_VERT, 0.25)).join("")
    + `<line x1="12" y1="16" x2="21.5" y2="16" stroke="${BLEU}" stroke-width="0.8"/><polygon points="24,16 20.5,14 20.5,18" fill="${BLEU}"/>`
    + jeton(29, 16, JETON_ROUGE, 0.6));
}

// ── La barre de dix et les cubes ──────────────────────────────────────────

/** Une barre de dix cubes, puis les cubes seuls, un peu à l'écart : aux couleurs de l'atelier « Nombres en cubes ». */
function svgBarreEtCubes(unites: number): string {
  const c = 4.2, { d, u } = REGLAGES_CUBES.couleurs;
  const carre = (x: number, fond: string) => `<rect x="${n2(x)}" y="0.5" width="${c}" height="${c}" fill="${fond}" stroke="${NOIR}" stroke-width="0.3"/>`;
  const barre = de(0, 9).map((k) => carre(0.5 + k * c, d)).join("") + `<rect x="0.5" y="0.5" width="${10 * c}" height="${c}" fill="none" stroke="${NOIR}" stroke-width="0.6"/>`;
  const x0 = 0.5 + 10 * c + 4;
  const cubes = de(1, unites).map((k) => carre(x0 + (k - 1) * (c + 1.6), u)).join("");
  return svg(x0 + Math.max(unites, 1) * (c + 1.6), c + 1, barre + cubes);
}

// ── La frise, relier ──────────────────────────────────────────────────────

const frise = (debut: number, fin: number, trous: number[], corr: boolean) =>
  `<table class="dv-frise"><tr>${de(debut, fin).map((n) => (trous.includes(n)
    ? `<td class="dv-trou">${corr ? `<b>${n}</b>` : ""}</td>` : `<td>${n}</td>`)).join("")}</tr></table>`;

/** Des cases à vider sur la frise de 1 à 20 : le premier nombre reste écrit. */
const trousDeLaFrise = (alea: () => number, combien: number) => melanger(alea, de(2, 20)).slice(0, combien).sort((a, b) => a - b);

/** Relier : les mots à gauche, les nombres mélangés à droite, un point au bout de chacun ; au corrigé, chaque mot relié au sien. */
function relier(nombres: number[], droite: number[], corr: boolean): string {
  return `<div class="dv-relier">${nombres.map((n, i) => `<div class="dv-relier-g">${nombreEnLettres(n)} <span class="dv-point"></span></div>`
    + `<div class="${corr ? "dv-relie" : ""}"></div><div class="dv-relier-d"><span class="dv-point"></span> ${corr ? n : droite[i]}</div>`).join("")}</div>`;
}

// ── Séance 1 : jusqu'à 9 ──────────────────────────────────────────────────

/** Deux groupes de billes, de part et d'autre d'un trait, par lignes de cinq. */
function svgDeuxGroupes(a: number, b: number): string {
  const r = 2.6, pas = 6.4, l = 5 * pas;
  const groupe = (n: number, x0: number, hex: string) =>
    de(0, n - 1).map((i) => bille(x0 + (i % 5) * pas + r + 0.6, 3.4 + Math.floor(i / 5) * pas, r, hex)).join("");
  return svg(2 * l + 7, 13.2, groupe(a, 0, BLEUES.hex)
    + `<line x1="${n2(l + 3.5)}" y1="0.4" x2="${n2(l + 3.5)}" y2="12.8" stroke="${NOIR}" stroke-width="0.4" stroke-dasharray="1 1"/>` + groupe(b, l + 7, ROUGES.hex));
}

function feuilleJusquaNeuf(graine: number): string {
  const alea = hasard(graine);
  const couleurs = [BLEUES, ROUGES, VERTES];
  const boites = melanger(alea, de(4, 9)).map((n, i) => ({ n, hex: couleurs[i % 3].hex, pts: disperser(alea, n, 3.8, 46.2, 3.8, 24.2, 8.6) }));
  const paires = melanger(alea, de(6, 9)).map((n) => { const a = entier(alea, 1, n - 1); return { a, b: n - a }; });
  const titre = "Jusqu'à 9 : combien de billes ?";
  const corps = (corr: boolean) => exo(1, "Je compte les billes de chaque boîte. J'écris le nombre dessous.",
    `<div class="dv-boites">${boites.map((b) => `<div class="dv-boite">${svg(50, 28, b.pts.map((p) => bille(p.x, p.y, 2.8, b.hex)).join(""))}`
      + `<div class="dv-ligne">${rep(corr, b.n)}</div></div>`).join("")}</div>`)
    + exo(2, "Je compte les billes de chaque côté du trait. J'écris combien cela fait en tout.",
      paires.map(({ a, b }) => `<div class="dv-rang">${svgDeuxGroupes(a, b)}<span class="dv-ligne">${rep(corr, a)} et ${rep(corr, b)} font ${rep(corr, a + b)}</span></div>`).join(""));
  return `<div class="page">${entete(titre, "Je fais les deux exercices dans l'ordre.")}${corps(false)}</div>` + corrige(titre, corps(true));
}

// ── Séance 2 : le paquet de dix ───────────────────────────────────────────

function feuillePaquetDeDix(graine: number): string {
  const alea = hasard(graine);
  const couleurs = melanger(alea, [BLEUES, ROUGES, VERTES]);
  const L = 160, H = 42, r = 3;
  // De 12 à 19 : « billes seules » au pluriel, sans que la phrase trahisse la réponse.
  const collections = melanger(alea, de(12, 19)).slice(0, 3).map((n, i) => ({ n, hex: couleurs[i].hex, pts: collection(alea, n, L, H, r) }));
  const titre = "Un paquet de dix";
  const corps = (corr: boolean) => collections.map((c) => `<div class="dv-bloc"><div class="dv-cadre">${svgCollection(c.pts, L, H, r, c.hex, corr)}</div>`
    + `<div class="dv-ligne">${rep(corr, 1)} paquet de dix et ${rep(corr, c.n - 10)} billes seules : ${rep(corr, c.n)} billes en tout.</div></div>`).join("");
  return `<div class="page">${entete(titre, "J'entoure dix billes : c'est un paquet de dix. Je compte les billes qui restent seules. J'écris combien il y a de billes en tout.")}${corps(false)}</div>`
    + corrige(titre, corps(true));
}

// ── Séance 3 : de 10 à 16 ─────────────────────────────────────────────────

function feuilleDixASeize(graine: number): string {
  const alea = hasard(graine);
  const noms = melanger(alea, de(11, 16));
  const droite = melanger(alea, noms);
  const [dessins, aDessiner] = ((l: number[]) => [l.slice(0, 4), l.slice(4, 6)])(melanger(alea, de(10, 16)));
  const titre = "De 10 à 16 : le nom et l'écriture";
  const tableau = (corr: boolean) => `<table class="dv-tableau"><tr><th></th><th>dizaine</th><th>unités</th><th>le nombre</th></tr>`
    + dessins.map((n) => `<tr><td class="dv-gauche">${svgBarreEtCubes(n - 10)}</td><td>${rep(corr, 1)}</td><td>${rep(corr, n - 10)}</td><td>${rep(corr, n)}</td></tr>`).join("") + "</table>";
  const corps = (corr: boolean) => exo(1, "Je relie chaque nom à son nombre.", relier(noms, droite, corr))
    + exo(2, "J'écris combien je vois de dizaines et d'unités, puis le nombre.", tableau(corr))
    + exo(3, "Je dessine la barre de dix et les cubes de chaque nombre.",
      `<div class="dv-dessiner-rang">${aDessiner.map((n) => `<div class="dv-dessiner"><b>${n}</b>${corr ? svgBarreEtCubes(n - 10) : ""}</div>`).join("")}</div>`);
  return `<div class="page">${entete(titre, "Je fais les trois exercices dans l'ordre.")}${corps(false)}</div>` + corrige(titre, corps(true));
}

// ── Séance 4 : les cartes de billes, qui a gagné, l'abaque, la frise ──────

function feuilleBillesDispersees(graine: number): string {
  const alea = hasard(graine);
  const L = 160, H = 44, r = 3;
  // Les trois cartes du manuel : dix-neuf billes bleues, dix-huit rouges, dix-sept vertes ; chaque élève en reçoit une.
  const cartes = [{ n: 19, c: BLEUES }, { n: 18, c: ROUGES }, { n: 17, c: VERTES }].map((k) => ({ ...k, pts: collection(alea, k.n, L, H, r) }));
  const titre = "Combien de billes ?";
  const carte = (k: (typeof cartes)[number], corr: boolean) => `<div class="dv-carte"><div class="dv-carte-titre">Les billes ${k.c.nom}</div>`
    + svgCollection(k.pts, L, H, r, k.c.hex, corr)
    + `<div class="dv-ligne">Il y a ${rep(corr, k.n)} billes ${k.c.nom}.${corr ? ` Une dizaine et ${nombreEnLettres(k.n - 10)} unités.` : ""}</div></div>`;
  return `<div class="page">${entete(titre, "Je compte les billes de ma carte. J'écris combien il y en a.", MANUEL)}${cartes.map((k) => carte(k, false)).join("")}</div>`
    + corrige(titre, cartes.map((k) => carte(k, true)).join(""));
}

function feuilleBillesEtCalots(graine: number): string {
  const alea = hasard(graine);
  const liste = parties(alea, 4);
  const titre = "Qui a gagné ?";
  const corps = (corr: boolean) => regleDuCalot() + liste.map((p, i) => htmlPartie(`Partie ${i + 1}`, p, corr)).join("");
  return `<div class="page">${entete(titre, "Un calot vaut dix billes. J'écris combien de billes chaque joueur a gagnées. J'entoure la lettre du gagnant.", MANUEL)}${corps(false)}</div>`
    + corrige(titre, corps(true));
}

function feuilleAbaque(graine: number): string {
  const alea = hasard(graine);
  const k = entier(alea, 3, 9);
  const aLire = melanger(alea, de(10, 20)).slice(0, 4);
  const aDessiner = melanger(alea, de(11, 19).filter((n) => !aLire.includes(n))).slice(0, 4);
  const titre = "L'abaque à deux tiges";
  const verts = (n: number) => Array<Jeton>(n).fill("vert");
  const corps = (corr: boolean) => exo(1, "J'échange dix jetons verts contre un jeton rouge. Je dessine les jetons après l'échange. J'écris le nombre.",
    `<div class="dv-echange">${svgAbaque([verts(10), verts(k)], { etiquettes: false })}<div class="dv-fleche">${svgEchange()}</div>`
      + `${svgAbaque(corr ? jetonsDe(10 + k) : aucun)}<div class="dv-ligne">Le nombre : ${rep(corr, 10 + k)}</div></div>`)
    + exo(2, "J'écris le nombre de chaque abaque.",
      `<div class="dv-abaques">${aLire.map((n) => `<div>${svgAbaque(jetonsDe(n))}<div class="dv-ligne">${rep(corr, n)}</div></div>`).join("")}</div>`)
    + exo(3, "Je dessine les jetons de chaque nombre : les rouges sur la tige des dizaines, les verts sur la tige des unités.",
      `<div class="dv-abaques">${aDessiner.map((n) => `<div>${svgAbaque(corr ? jetonsDe(n) : aucun)}<div class="dv-ligne"><b>${n}</b></div></div>`).join("")}</div>`);
  return `<div class="page">${entete(titre, "Je regarde la place des jetons : à gauche les dizaines, à droite les unités.", MANUEL)}${corps(false)}</div>`
    + corrige(titre, corps(true));
}

function feuilleFrise(graine: number): string {
  const alea = hasard(graine);
  // La première frise du manuel : 7, 8, 9 manquent, et 17, 18, 19 — on les entend dans dix-sept, dix-huit, dix-neuf.
  const frises = [[7, 8, 9, 10, 17, 18, 19], trousDeLaFrise(alea, 6), trousDeLaFrise(alea, 8), trousDeLaFrise(alea, 10)];
  const voisins = melanger(alea, de(11, 19)).slice(0, 6);
  const titre = "La frise jusqu'à 20";
  const corps = (corr: boolean) => exo(1, "J'écris les nombres qui manquent sur chaque frise.", frises.map((t) => frise(1, 20, t, corr)).join(""))
    + exo(2, "J'écris le nombre qui vient juste avant, et celui qui vient juste après.",
      `<div class="dv-voisins">${voisins.map((n) => `<div>${rep(corr, n - 1)} <b class="dv-gros">${n}</b> ${rep(corr, n + 1)}</div>`).join("")}</div>`);
  return `<div class="page">${entete(titre, "Je fais les deux exercices dans l'ordre.", MANUEL)}${corps(false)}</div>` + corrige(titre, corps(true));
}

// ── Séance 5 : comparer et ranger ─────────────────────────────────────────

type Representation = "chiffres" | "lettres" | "unites" | "abaque" | "calots";

function representer(n: number, sorte: Representation): string {
  const d = Math.floor(n / 10), u = n % 10;
  switch (sorte) {
    case "chiffres": return `<span class="dv-gros">${n}</span>`;
    case "lettres": return `<span class="dv-mot">${nombreEnLettres(n)}</span>`;
    case "unites": return `<span class="dv-mot">${d} dizaine${d > 1 ? "s" : ""} et ${u} unité${u > 1 ? "s" : ""}</span>`;
    case "abaque": return svgAbaque(jetonsDe(n), { echelle: 0.66 });
    case "calots": return svgJeu({ calots: d, billes: u }, 5, 0.8);
  }
}

function feuilleComparer(graine: number): string {
  const alea = hasard(graine);
  const deux = () => melanger(alea, de(10, 20)).slice(0, 2) as [number, number];
  const chiffres = de(1, 6).map(deux);
  const sortes: [Representation, Representation][] = [["abaque", "chiffres"], ["calots", "lettres"], ["unites", "abaque"], ["lettres", "calots"]];
  const paires = sortes.map(([s, t]) => { const [x, y] = deux(); return { x, y, s, t }; });
  const listes = [0, 1].map(() => melanger(alea, de(10, 20)).slice(0, 5));
  const titre = "Comparer et ranger jusqu'à 20";
  const entoure = (corr: boolean, oui: boolean) => (corr && oui ? " dv-gagne" : "");
  const corps = (corr: boolean) => exo(1, "J'entoure le plus grand nombre de chaque paire.",
    `<div class="dv-paires-chiffres">${chiffres.map(([x, y]) => `<div class="dv-paire-n"><span class="dv-n${entoure(corr, x > y)}">${x}</span>`
      + `<span class="dv-n${entoure(corr, y > x)}">${y}</span></div>`).join("")}</div>`)
    + exo(2, "J'entoure celui qui montre le plus grand nombre.",
      `<div class="dv-paires">${paires.map((p) => `<div class="dv-paire"><div class="dv-repr${entoure(corr, p.x > p.y)}">${representer(p.x, p.s)}</div>`
        + `<span class="dv-ou">ou</span><div class="dv-repr${entoure(corr, p.y > p.x)}">${representer(p.y, p.t)}</div></div>`).join("")}</div>`)
    + exo(3, "Je range les nombres du plus petit au plus grand.",
      listes.map((l) => `<div class="dv-ranger"><div class="dv-a-ranger">${l.map((n) => `<span>${n}</span>`).join("")}</div>`
        + `<div class="dv-cases">${[...l].sort((a, b) => a - b).map((n) => `<span class="dv-case">${corr ? n : ""}</span>`).join("")}</div></div>`).join(""));
  return `<div class="page">${entete(titre, "Je fais les trois exercices dans l'ordre.")}${corps(false)}</div>` + corrige(titre, corps(true));
}

// ── Séance 6 : l'évaluation ───────────────────────────────────────────────

function feuilleEvaluation(graine: number): string {
  const alea = hasard(graine);
  const n = entier(alea, 15, 19);
  const L = 160, H = 40, r = 3;
  const pts = collection(alea, n, L, H, r);
  const abaques = melanger(alea, de(10, 20)).slice(0, 3);
  const [partie] = parties(alea, 1);
  const trous = trousDeLaFrise(alea, 7);
  // À dicter : un de 17 à 19, un de 11 à 16, dix ou vingt, et un autre.
  const dictee = (() => {
    const a = entier(alea, 17, 19), b = entier(alea, 11, 16), c = alea() < 0.5 ? 10 : 20;
    const d = melanger(alea, de(11, 19).filter((x) => x !== a && x !== b))[0];
    return melanger(alea, [a, b, c, d]);
  })();
  const noms = melanger(alea, [...melanger(alea, de(11, 16)).slice(0, 2), ...melanger(alea, de(17, 19)).slice(0, 2)]);
  const droite = melanger(alea, noms);
  const titre = "Évaluation — les nombres de 10 à 20";
  const corps = (corr: boolean) => exo(1, "Je compte les billes. J'écris combien il y en a.",
    `<div class="dv-cadre">${svgCollection(pts, L, H, r, VERTES.hex, corr)}</div><div class="dv-ligne">Il y a ${rep(corr, n)} billes.</div>`)
    + exo(2, "J'écris le nombre de chaque abaque.",
      `<div class="dv-abaques dv-trois">${abaques.map((x) => `<div>${svgAbaque(jetonsDe(x))}<div class="dv-ligne">${rep(corr, x)}</div></div>`).join("")}</div>`)
    + exo(3, "Un calot vaut dix billes. J'écris combien de billes chaque joueur a gagnées. J'entoure la lettre du gagnant.", htmlPartie("", partie, corr))
    + exo(4, "J'écris les nombres qui manquent sur la frise.", frise(1, 20, trous, corr))
    + exo(5, "J'écris en chiffres les nombres que j'entends.",
      (corr ? `<div class="dv-adulte">À dicter : ${dictee.map(nombreEnLettres).join(", ")}.</div>` : "")
        + `<div class="dv-dictee">${dictee.map((x) => `<span>${corr ? x : ""}</span>`).join("")}</div>`)
    + exo(6, "Je relie chaque nom à son nombre.", relier(noms, droite, corr));
  return `<div class="page">${entete(titre, "Je fais les exercices dans l'ordre. Je relis mes réponses.")}${corps(false)}</div>` + corrige(titre, corps(true));
}

// ── La feuille ────────────────────────────────────────────────────────────

const FEUILLES: Record<FeuilleDixAVingt, (graine: number) => string> = {
  "jusqua-9": feuilleJusquaNeuf, "paquet-de-dix": feuillePaquetDeDix, "dix-a-seize": feuilleDixASeize, "billes-dispersees": feuilleBillesDispersees,
  "billes-et-calots": feuilleBillesEtCalots, abaque: feuilleAbaque, "frise-20": feuilleFrise, "comparer-20": feuilleComparer, evaluation: feuilleEvaluation,
};

export const htmlDixAVingt = (quoi: FeuilleDixAVingt, graine: number) => feuille(FEUILLES[quoi](graine), "dv");

export const STYLE_DIX_A_VINGT = `
  .feuille.dv svg { display: block; }
  .feuille.dv .dv-exo { break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-consigne { font-size: 13.5px; font-weight: 700; margin: 5mm 0 2mm; }
  .feuille.dv .dv-blanc { display: inline-block; width: 16mm; height: 6mm; border-bottom: 2px dotted #1c2233; vertical-align: bottom; }
  .feuille.dv .dv-rep { color: #2f6fd1; }
  .feuille.dv .dv-ligne { font-size: 14px; line-height: 2; margin: 1mm 0 0; }
  .feuille.dv .dv-espace { margin-left: 7mm; }
  .feuille.dv .dv-bloc { margin: 0 0 4mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-cadre { display: inline-block; border: 1.2px solid #c4c9d6; border-radius: 3mm; padding: 1mm; }
  .feuille.dv .dv-boites { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
  .feuille.dv .dv-boite { border: 1.2px solid #c4c9d6; border-radius: 3mm; padding: 1.5mm; text-align: center; break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-boite svg, .feuille.dv .dv-abaques svg { margin: 0 auto; }
  .feuille.dv .dv-rang { display: flex; align-items: center; gap: 6mm; margin: 0 0 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-carte { border: 1.5px dashed #9aa0b4; border-radius: 2mm; padding: 2mm 3mm; margin: 0 0 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-carte-titre { font-size: 14px; font-weight: 800; margin: 0 0 1mm; }
  .feuille.dv .dv-regle-jeu { display: flex; align-items: center; gap: 4mm; border: 1.2px solid #cfd4e2; border-radius: 3mm; padding: 2mm 3mm; margin: 0 0 4mm;
    font-size: 14px; font-weight: 700; background: #f7f8fc; break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-partie { border: 1.2px solid #c4c9d6; border-radius: 3mm; padding: 2mm 3mm; margin: 0 0 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-partie-titre { font-size: 12px; font-weight: 800; color: #687087; margin: 0 0 1mm; }
  .feuille.dv .dv-joueur { display: flex; align-items: center; gap: 3mm; margin: 0 0 1.5mm; }
  .feuille.dv .dv-lettre { display: inline-flex; align-items: center; justify-content: center; width: 7mm; height: 7mm; border: 1.2px solid #1c2233;
    border-radius: 50%; font-weight: 800; font-size: 14px; line-height: 1; vertical-align: middle; }
  .feuille.dv .dv-lettre.dv-gagne { border: 2.4px solid #d64545; }
  .feuille.dv .dv-echange { display: flex; align-items: center; gap: 6mm; margin: 0 0 2mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-abaques { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm 3mm; text-align: center; break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-abaques .dv-ligne { line-height: 1.6; margin: 0.5mm 0 0; }
  .feuille.dv .dv-abaques.dv-trois { grid-template-columns: repeat(3, 1fr); }
  .feuille.dv table.dv-frise, .feuille.dv table.dv-tableau { width: auto; }
  .feuille.dv .dv-frise { border-collapse: collapse; margin: 0 auto 4mm; font-size: 14px; }
  .feuille.dv .dv-frise td { border: 1.2px solid #1c2233; width: 7.6mm; height: 10mm; padding: 0; text-align: center; vertical-align: middle; }
  .feuille.dv .dv-frise td.dv-trou { background: #f7f8fc; }
  .feuille.dv .dv-voisins { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 10mm; font-size: 14px; margin: 0 0 0 4mm; }
  .feuille.dv .dv-gros { font-size: 20px; font-weight: 800; margin: 0 2mm; }
  .feuille.dv .dv-mot { font-size: 14px; font-weight: 700; text-align: center; }
  .feuille.dv .dv-tableau { border-collapse: collapse; margin: 1mm 0 2mm; font-size: 13px; }
  .feuille.dv .dv-tableau th, .feuille.dv .dv-tableau td { border: 1.2px solid #1c2233; padding: 1.5mm 3mm; text-align: center; vertical-align: middle; }
  .feuille.dv .dv-tableau th { background: #f0f2f8; font-size: 12px; }
  .feuille.dv .dv-tableau td.dv-gauche { text-align: left; }
  .feuille.dv .dv-relier { display: grid; grid-template-columns: max-content 38mm max-content; row-gap: 3.2mm; align-items: center; margin: 1mm 0 2mm 8mm;
    font-size: 15px; font-weight: 700; break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-relier-g { justify-self: end; display: flex; align-items: center; gap: 2mm; }
  .feuille.dv .dv-relier-d { display: flex; align-items: center; gap: 2mm; }
  .feuille.dv .dv-point { display: inline-block; width: 2.2mm; height: 2.2mm; border-radius: 50%; background: #1c2233; }
  .feuille.dv .dv-relie { border-top: 1.6px solid #2f6fd1; margin: 0 1mm; }
  .feuille.dv .dv-dessiner-rang { display: flex; gap: 5mm; }
  .feuille.dv .dv-dessiner { flex: 1; display: flex; align-items: center; gap: 4mm; border: 1.5px dashed #c4c9d6; border-radius: 3mm; min-height: 14mm; padding: 1mm 3mm; font-size: 16px; }
  .feuille.dv .dv-paires-chiffres { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm 6mm; font-size: 17px; font-weight: 700; }
  .feuille.dv .dv-paire-n { display: flex; justify-content: center; gap: 4mm; border: 1.2px solid #c4c9d6; border-radius: 3mm; padding: 1.5mm; }
  .feuille.dv .dv-n { display: inline-block; min-width: 9mm; padding: 1mm 1.5mm; text-align: center; border: 2px solid transparent; border-radius: 50%; }
  .feuille.dv .dv-n.dv-gagne { border-color: #d64545; }
  .feuille.dv .dv-paires { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 6mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-paire { display: flex; align-items: center; justify-content: center; gap: 3mm; }
  .feuille.dv .dv-repr { display: flex; align-items: center; justify-content: center; min-width: 30mm; min-height: 22mm; padding: 1.5mm; border: 1.2px solid #c4c9d6; border-radius: 3mm; }
  .feuille.dv .dv-repr.dv-gagne { border: 2.4px solid #d64545; }
  .feuille.dv .dv-ou { font-size: 13px; color: #687087; }
  .feuille.dv .dv-ranger { display: flex; align-items: center; gap: 8mm; margin: 0 0 3mm 4mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-a-ranger { display: flex; gap: 4mm; font-size: 16px; font-weight: 700; }
  .feuille.dv .dv-cases { display: flex; gap: 1.5mm; }
  .feuille.dv .dv-case { display: inline-block; width: 11mm; height: 9mm; line-height: 9mm; border: 1.2px solid #1c2233; text-align: center; font-weight: 700; color: #2f6fd1; }
  .feuille.dv .dv-dictee { display: flex; gap: 6mm; margin: 0 0 2mm 4mm; }
  .feuille.dv .dv-dictee span { display: flex; align-items: center; justify-content: center; width: 20mm; height: 13mm; border: 1.2px solid #1c2233; border-radius: 2mm;
    font-weight: 800; font-size: 18px; color: #2f6fd1; }
  .feuille.dv .dv-adulte { font-size: 12px; color: #687087; margin: 0 0 2mm 4mm; }
`;
