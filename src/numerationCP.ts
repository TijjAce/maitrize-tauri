// La numération au CP, en manipulant : des billes et des calots, l'abaque à
// deux tiges, la suite des nombres. Trois ateliers de Fabriquer — « Billes
// et calots », « L'abaque », « La suite des nombres » — dont la séquence « La
// connaissance des nombres de 10 à 20 » (voir demarcheDixAVingt.ts) prend
// ses feuilles, à ses réglages : chacune se rouvre dans son atelier.
//
// Les supports viennent de la séance 4 de cette séquence, d'après un manuel
// de préparation au CRPE que l'enseignant a fourni : des cartes de billes
// dispersées à dénombrer, de trois couleurs ; des billes et des calots — un
// calot vaut dix billes — pour savoir qui a gagné la partie ; l'abaque à deux
// tiges, où dix jetons verts s'échangent contre un rouge, posé sur la tige
// des dizaines ; la frise à compléter. Les ateliers les étendent jusqu'à 100,
// que le CP atteint en période 3, et à ce qui les prépare : les nombres
// jusqu'à 9 et leurs décompositions. Les nombres sont tirés au sort ; le
// corrigé suit, sur sa page.
//
// La feuille est souvent photocopiée en noir et blanc : une bille garde son
// reflet, le calot est plus gros et porte sa spirale, le jeton rouge a un
// bord épais — et c'est la tige qui dit la dizaine, comme le veut la séance.

import { feuille } from "./cartesImprimables";
import { REGLAGES_CUBES } from "./cubesNumeration";
import { hasard, melanger } from "./hasard";
import { entier } from "./nombres";
import { nombreEnLettres } from "./nombresEnLettres";

const NOIR = "#1c2233", BLEU = "#2f6fd1";
interface Couleur { nom: string; hex: string }
const BLEUES: Couleur = { nom: "bleues", hex: "#4a86e8" };
const ROUGES: Couleur = { nom: "rouges", hex: "#e05252" };
const VERTES: Couleur = { nom: "vertes", hex: "#38a169" };
const COULEURS = [BLEUES, ROUGES, VERTES];
const JETON_ROUGE = "#e05252", JETON_VERT = "#38a169";

const PROGRAMME = '<span class="reference">Programme de mathématiques du cycle 2, 2024.</span>';
const MANUEL = `<span class="reference">D'après Réussir mon CRPE, oral 2025-2026 (Nathan), p. 40-43.</span>`;
const entete = (titre: string, consigne: string, source: string) => `<div class="titre">${titre}</div>
  <div class="sous">Prénom : ........................................ Date : ........................</div>
  <div class="regle">${consigne} ${source}</div>`;
/** Une feuille et son corrigé, sur sa page. */
const page = (titre: string, consigne: string, corps: (corr: boolean) => string, source = PROGRAMME) =>
  `<div class="page">${entete(titre, consigne, source)}${corps(false)}</div>`
  + `<div class="page corrige"><div class="titre">${titre} — corrigé</div>${corps(true)}</div>`;
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
const de = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** `combien` nombres de `a` à `b`, tous différents tant que l'intervalle le permet. */
function tirer(alea: () => number, a: number, b: number, combien: number): number[] {
  const tous = de(a, b);
  const sortie: number[] = [];
  while (sortie.length < combien) sortie.push(...melanger(alea, tous).slice(0, combien - sortie.length));
  return sortie;
}

/** Des bornes « de … à … » lues d'un réglage, rangées et ramenées entre `min` et `max`, à `ecart` au moins l'une de l'autre. */
function bornes(de0: unknown, a0: unknown, min: number, max: number, defaut: [number, number], ecart = 0): [number, number] {
  const lire = (v: unknown, d: number) => Math.max(min, Math.min(max, typeof v === "number" && Number.isFinite(v) ? Math.round(v) : d));
  let x = lire(de0, defaut[0]), y = lire(a0, defaut[1]);
  if (x > y) [x, y] = [y, x];
  if (y - x < ecart) { y = Math.min(max, x + ecart); x = Math.max(min, y - ecart); }
  return [x, y];
}

const entierLu = (v: unknown, min: number, max: number, defaut: number) =>
  Math.max(min, Math.min(max, typeof v === "number" && Number.isFinite(v) ? Math.round(v) : defaut));

/** « une dizaine et neuf unités », « quatre dizaines », « sept unités ». */
function dizainesEtUnites(n: number): string {
  const d = Math.floor(n / 10), u = n % 10;
  const dz = d === 1 ? "une dizaine" : `${nombreEnLettres(d)} dizaines`;
  const un = u === 1 ? "une unité" : `${nombreEnLettres(u)} unités`;
  return d && u ? `${dz} et ${un}` : d ? dz : un;
}

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
 * moins les uns des autres et des `voisins` : une collection qu'on ne compte
 * pas d'un coup d'œil, où aucune bille n'en cache une autre.
 */
function disperser(alea: () => number, n: number, x0: number, x1: number, y0: number, y1: number, ecart: number, voisins: Point[] = []): Point[] {
  for (let essai = 0; essai < 40; essai++) {
    const pts: Point[] = [];
    for (let k = 0; k < 60 * n + 200 && pts.length < n; k++) {
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

/** Le cadre d'une collection de `n` billes : plus elle est grande, plus il est haut et plus les billes sont petites. */
const cadreDe = (n: number) => (n <= 20 ? { l: 160, h: 44, r: 3 } : n <= 59 ? { l: 160, h: 70, r: 2.5 } : { l: 160, h: 78, r: 2 });

/** Une collection : ses billes, et ses paquets de dix — les dix premières, les dix suivantes… — que le corrigé entoure. */
interface Collection { n: number; pts: Point[]; paquets: number; l: number; h: number; r: number }

/**
 * Une collection de `n` billes dispersées. Jusqu'à 59, chaque paquet de dix
 * a sa bande, de gauche à droite, et le reste la dernière, sans que les
 * bandes se voient : le corrigé entoure chaque paquet d'un trait qui ne
 * touche aucune autre bille. On tire jusqu'à ce que ce soit le cas ; sinon,
 * un écart entre les bandes le garantit. Au-delà, le corrigé n'entoure rien.
 */
function collection(alea: () => number, n: number): Collection {
  const { l, h, r } = cadreDe(n);
  const ecart = 2 * r + 3.4, m = r + 1.2;
  const paquets = n <= 59 ? Math.floor(n / 10) : 0;
  if (!paquets) return { n, pts: disperser(alea, n, m, l - m, m, h - m, ecart), paquets, l, h, r };
  // Du centre d'une bille au trait : sa marge et son épaisseur ; puis le rayon de l'autre bille, et un millimètre d'air.
  const degage = margeDuTrait(r) + 0.5 + r + 1;
  const bandes = [...Array<number>(paquets).fill(10), n - 10 * paquets].filter((x) => x > 0);
  for (let essai = 0; ; essai++) {
    const fente = essai < 40 ? 0 : degage;
    const utile = l - 2 * m - fente * (bandes.length - 1);
    const pts: Point[] = [];
    let x = m;
    for (const combien of bandes) {
      const large = (utile * combien) / n;
      pts.push(...disperser(alea, combien, x, x + large, m, h - m, ecart, pts));
      x += large + fente;
    }
    const libre = de(0, paquets - 1).every((p) => {
      const tour = enveloppe(pts.slice(10 * p, 10 * p + 10));
      return pts.every((q, i) => Math.floor(i / 10) === p || distanceAuPolygone(q, tour) >= degage);
    });
    if (fente || libre) return { n, pts, paquets, l, h, r };
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

/**
 * Une collection dessinée. Au corrigé, ses paquets de dix entourés ; quand il
 * n'y en a qu'un, ses billes numérotées dans l'ordre où on les compte.
 */
function svgCollection(c: Collection, hex: string, corr: boolean): string {
  const paquets = corr ? de(0, c.paquets - 1).map((p) => c.pts.slice(10 * p, 10 * p + 10)) : [];
  const rangs = new Map(paquets.length === 1 ? chemin(paquets[0]).map((p, i) => [p, i + 1]) : []);
  return svg(c.l, c.h, paquets.map((p) => entourer(p, margeDuTrait(c.r))).join("") + c.pts.map((p) => bille(p.x, p.y, c.r, hex, rangs.get(p))).join(""));
}

/** Ce qu'un joueur a gagné : des calots et des billes. */
interface Jeu { calots: number; billes: number }
const valeurDe = (j: Jeu) => 10 * j.calots + j.billes;

/** Les calots d'un joueur, puis ses billes ; `parRang` billes et `calotsParRang` calots au plus par ligne. */
function svgJeu(j: Jeu, { parRang = 20, calotsParRang = 10, echelle = 1 } = {}): string {
  const R = 4.4, r = 2.6, pas = 6.3, pasCalot = 2 * R + 2;
  const rangsB = Math.max(1, Math.ceil(j.billes / parRang)), rangsC = Math.max(1, Math.ceil(j.calots / calotsParRang));
  const hBilles = 2 * r + (rangsB - 1) * pas, hCalots = j.calots ? 2 * R + (rangsC - 1) * pasCalot : 0;
  // Les billes et les calots, centrés sur la même ligne.
  const h = Math.max(hCalots, hBilles) + 1.2;
  const morceaux: string[] = [];
  const yc = (h - hCalots) / 2 + R;
  for (let c = 0; c < j.calots; c++) morceaux.push(calot(0.6 + R + (c % calotsParRang) * pasCalot, yc + Math.floor(c / calotsParRang) * pasCalot, R));
  const finCalots = 0.6 + Math.min(j.calots, calotsParRang) * pasCalot;
  const x0 = j.calots ? finCalots + 1 : 0.6, y0 = (h - hBilles) / 2 + r;
  for (let k = 0; k < j.billes; k++) morceaux.push(bille(x0 + (k % parRang) * pas + r, y0 + Math.floor(k / parRang) * pas, r, BLEUES.hex));
  return svg(j.billes ? x0 + Math.min(j.billes, parRang) * pas : finCalots, h, morceaux.join(""), echelle);
}

/** La règle du jeu, dessinée : un calot vaut dix billes. */
function regleDuCalot(): string {
  const r = 2.6, pas = 6.3, R = 4.4;
  const billes = de(0, 9).map((k) => bille(19 + k * pas + r, 5, r, BLEUES.hex)).join("");
  return `<div class="dv-regle-jeu">${svg(19 + 10 * pas + 1, 10, calot(R + 0.6, 5, R) + `<text x="13" y="6.6" font-size="5" font-weight="800" text-anchor="middle" fill="${NOIR}">=</text>` + billes)}<span>Un calot vaut dix billes.</span></div>`;
}

/** Une partie : deux joueurs, A et B, et ce que chacun a gagné. */
type Partie = [Jeu, Jeu];

/** Un nombre en calots et en billes : le moins d'objets possible… */
const enCalots = (v: number): Jeu => ({ calots: Math.floor(v / 10), billes: v % 10 });
/** … ou un calot défait en dix billes : plus d'objets, la même valeur. */
const unCalotDefait = (v: number): Jeu => (v >= 10 ? { calots: Math.floor(v / 10) - 1, billes: (v % 10) + 10 } : enCalots(v));

/**
 * Les parties, de la plus simple à la plus fine. De 10 à 20, celles du
 * manuel : un calot et des billes contre plus de billes que d'objets chez
 * l'autre — le calot gagne quand même —, des billes seules qui l'emportent,
 * deux joueurs qui ont chacun un calot, puis vingt. Sinon : les calots et les
 * billes au plus juste, puis un joueur qui a défait un calot en dix billes —
 * plus d'objets, et pourtant pas forcément plus de billes. Qui est A, qui est
 * B : au hasard.
 */
function parties(alea: () => number, de0: number, a0: number, combien: number): Partie[] {
  const liste: Partie[] = [];
  if (de0 <= 10 && a0 === 20) {
    const a = entier(alea, 5, 9);
    const u = entier(alea, 2, 6);
    const [v, w] = melanger(alea, de(1, 9)).slice(0, 2);
    liste.push(
      [{ calots: 1, billes: a }, { calots: 0, billes: 9 + a }],
      [{ calots: 0, billes: 10 + u + entier(alea, 1, 9 - u) }, { calots: 1, billes: u }],
      [{ calots: 1, billes: v }, { calots: 1, billes: w }],
      [{ calots: 2, billes: 0 }, alea() < 0.5 ? { calots: 0, billes: 19 } : { calots: 1, billes: 9 }],
    );
  }
  for (let i = liste.length; i < combien; i++) {
    const [v, w] = tirer(alea, de0, a0, 2).sort((x, y) => y - x);
    // v > w : au plus juste ; puis le plus petit en billes, qui a plus d'objets et perd ; puis le plus grand en billes.
    const sorte = i % 3;
    liste.push(sorte === 0 ? [enCalots(v), enCalots(w)] : sorte === 1 ? [enCalots(v), unCalotDefait(w)] : [unCalotDefait(v), enCalots(w)]);
  }
  return liste.slice(0, combien).map(([x, y]) => (alea() < 0.5 ? [x, y] : [y, x]));
}

const lettre = (l: string, gagne = false) => `<span class="dv-lettre${gagne ? " dv-gagne" : ""}">${l}</span>`;

/** Les objets d'un joueur sur une ligne, ou par lignes de dix billes quand ils n'y tiennent pas. */
const svgJoueur = (j: Jeu) => svgJeu(j, { parRang: j.calots * 10.8 + j.billes * 6.3 > 140 ? 10 : 20 });

function htmlPartie(titre: string, [a, b]: Partie, corr: boolean): string {
  const va = valeurDe(a), vb = valeurDe(b);
  return `<div class="dv-partie">${titre ? `<div class="dv-partie-titre">${titre}</div>` : ""}`
    + `<div class="dv-joueur">${lettre("A")}${svgJoueur(a)}</div><div class="dv-joueur">${lettre("B")}${svgJoueur(b)}</div>`
    + `<div class="dv-ligne">A : ${rep(corr, va)} billes. <span class="dv-espace">B : ${rep(corr, vb)} billes.</span>`
    + `<span class="dv-espace">Le gagnant : ${lettre("A", corr && va > vb)} ${lettre("B", corr && vb > va)}</span></div></div>`;
}

// ── L'abaque à deux tiges ─────────────────────────────────────────────────

type Jeton = "rouge" | "vert";
/** Les jetons d'un nombre jusqu'à 99 : des rouges sur la tige des dizaines, des verts sur celle des unités. */
const jetonsDe = (n: number): [Jeton[], Jeton[]] => [Array<Jeton>(Math.floor(n / 10)).fill("rouge"), Array<Jeton>(n % 10).fill("vert")];
const aucun: [Jeton[], Jeton[]] = [[], []];
const verts = (n: number) => Array<Jeton>(n).fill("vert");

const ellipseDeJeton = (x: number, y: number, j: Jeton, rx = 6.3, ry = 1.6) => `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${rx}" ry="${ry}" `
  + `fill="${j === "rouge" ? JETON_ROUGE : JETON_VERT}" stroke="${NOIR}" stroke-width="${j === "rouge" ? 0.65 : 0.3}"/>`;

/**
 * L'abaque : deux tiges sur un socle, dix jetons au plus sur chacune ; sous
 * le socle, le nom des tiges — les dizaines à gauche, les unités à droite —,
 * sauf avant l'échange, quand dix jetons verts occupent encore une tige.
 * `pile` : des jetons verts posés à côté, qui attendent d'aller sur une tige.
 */
function svgAbaque([gauche, droite]: [Jeton[], Jeton[]], { etiquettes = true, echelle = 0.8, pile = 0 } = {}): string {
  // Sans les noms des tiges, la même hauteur : deux abaques côte à côte ont leur socle à la même ligne.
  const L = pile ? 54 : 38, socle = 40, H = 51;
  const tige = (x: number) => `<line x1="${x}" y1="3" x2="${x}" y2="${socle}" stroke="#8a6a3d" stroke-width="1.1" stroke-linecap="round"/>`;
  const jetons = (x: number, liste: Jeton[]) => liste.map((j, k) => ellipseDeJeton(x, socle - 2.2 - k * 3.4, j)).join("");
  const noms = etiquettes ? `<text x="10" y="${H - 1}" font-size="3.4" text-anchor="middle" fill="${NOIR}">dizaines</text>`
    + `<text x="28" y="${H - 1}" font-size="3.4" text-anchor="middle" fill="${NOIR}">unités</text>` : "";
  // La pile : à plat sur la table, à droite du socle.
  const tas = de(0, pile - 1).map((k) => ellipseDeJeton(47, socle + 3.4 - k * 3.1, "vert", 5.4, 1.5)).join("");
  return svg(L, H, tige(10) + tige(28) + jetons(10, gauche) + jetons(28, droite)
    + `<rect x="1" y="${socle}" width="36" height="5" rx="1" fill="#d9b98c" stroke="${NOIR}" stroke-width="0.4"/>` + tas + noms, echelle);
}

/** L'échange, dessiné entre les deux abaques : dix jetons verts, une flèche, un jeton rouge. */
function svgEchange(): string {
  const jeton = (x: number, y: number, hex: string, bord: number) =>
    `<ellipse cx="${x}" cy="${n2(y)}" rx="4.4" ry="1.1" fill="${hex}" stroke="${NOIR}" stroke-width="${bord}"/>`;
  return svg(34, 30, de(0, 9).map((k) => jeton(5.5, 26 - k * 2.3, JETON_VERT, 0.25)).join("")
    + `<line x1="12" y1="16" x2="21.5" y2="16" stroke="${BLEU}" stroke-width="0.8"/><polygon points="24,16 20.5,14 20.5,18" fill="${BLEU}"/>`
    + jeton(29, 16, JETON_ROUGE, 0.6), 0.8);
}

// ── Les barres de dix et les cubes ────────────────────────────────────────

/**
 * Des barres de dix cubes, l'une sous l'autre, puis les cubes seuls, un peu à
 * l'écart, par lignes de cinq : aux couleurs de l'atelier « Nombres en cubes ».
 * Passé trois barres, les cubes rapetissent.
 */
function svgBarresEtCubes(dizaines: number, unites: number): string {
  const c = dizaines > 3 ? 3 : 4.2, { d, u } = REGLAGES_CUBES.couleurs;
  const carre = (x: number, y: number, fond: string) => `<rect x="${n2(x)}" y="${n2(y)}" width="${c}" height="${c}" fill="${fond}" stroke="${NOIR}" stroke-width="0.3"/>`;
  const barres = de(0, dizaines - 1).map((b) => {
    const y = 0.5 + b * (c + 1.2);
    return de(0, 9).map((k) => carre(0.5 + k * c, y, d)).join("") + `<rect x="0.5" y="${n2(y)}" width="${n2(10 * c)}" height="${c}" fill="none" stroke="${NOIR}" stroke-width="0.6"/>`;
  }).join("");
  const x0 = dizaines ? 0.5 + 10 * c + 4 : 0.5;
  const cubes = de(0, unites - 1).map((k) => carre(x0 + (k % 5) * (c + 1.6), 0.5 + Math.floor(k / 5) * (c + 1.2), u)).join("");
  return svg(x0 + Math.max(Math.min(unites, 5), 1) * (c + 1.6), Math.max(dizaines, Math.ceil(unites / 5), 1) * (c + 1.2), barres + cubes);
}

// ── La frise, relier ──────────────────────────────────────────────────────

const frise = (debut: number, fin: number, trous: number[], corr: boolean) =>
  `<table class="dv-frise${fin >= 100 ? " dv-frise-cent" : ""}"><tr>${de(debut, fin).map((n) => (trous.includes(n)
    ? `<td class="dv-trou">${corr ? `<b>${n}</b>` : ""}</td>` : `<td>${n}</td>`)).join("")}</tr></table>`;

/** Les cases à vider d'une frise de `debut` à `fin` : le premier nombre reste écrit. */
const trousDeLaFrise = (alea: () => number, debut: number, fin: number, combien: number) =>
  melanger(alea, de(debut + 1, fin)).slice(0, combien).sort((x, y) => x - y);

/** Relier : les mots à gauche, les nombres mélangés à droite, un point au bout de chacun ; au corrigé, chaque mot relié au sien. */
function relier(nombres: number[], droite: number[], corr: boolean): string {
  return `<div class="dv-relier">${nombres.map((n, i) => `<div class="dv-relier-g">${nombreEnLettres(n)} <span class="dv-point"></span></div>`
    + `<div class="${corr ? "dv-relie" : ""}"></div><div class="dv-relier-d"><span class="dv-point"></span> ${corr ? n : droite[i]}</div>`).join("")}</div>`;
}

// ── L'atelier « Billes et calots » ────────────────────────────────────────

export type ExerciceBilles = "compter" | "paquets" | "deux" | "partie";

/** Ce que chaque exercice prend : ses nombres, combien d'exercices sur la feuille et le mot qui les compte. */
export const EXERCICES_BILLES: {
  id: ExerciceBilles; libelle: string; min: number; max: number; defaut: [number, number]; nombre: { min: number; defaut: number; mot: string };
}[] = [
  { id: "compter", libelle: "Combien de billes ? — une collection dispersée", min: 3, max: 99, defaut: [17, 19], nombre: { min: 1, defaut: 3, mot: "collections" } },
  { id: "paquets", libelle: "Des paquets de dix — entourer, puis écrire le nombre", min: 11, max: 59, defaut: [12, 19], nombre: { min: 1, defaut: 3, mot: "collections" } },
  { id: "deux", libelle: "Deux tas — « … et … font … »", min: 2, max: 10, defaut: [6, 9], nombre: { min: 2, defaut: 4, mot: "lignes" } },
  { id: "partie", libelle: "Qui a gagné ? — un calot vaut dix billes", min: 10, max: 99, defaut: [10, 20], nombre: { min: 1, defaut: 4, mot: "parties" } },
];

export interface ReglagesBilles {
  titre: string;
  exercice: ExerciceBilles;
  /** Les nombres : de … à …. */
  de: number; a: number;
  /** Combien de collections, de lignes ou de parties sur la feuille. */
  nombre: number;
  /** « Qui a gagné ? » : la règle du calot dessinée en haut de la feuille. */
  regle: boolean;
}

export const REGLAGES_BILLES: ReglagesBilles = { titre: "", exercice: "partie", de: 10, a: 20, nombre: 4, regle: true };

/** Ce qui tient sur la page : neuf petites boîtes jusqu'à 10, trois cartes jusqu'à 20, deux au-delà ; huit lignes ; cinq parties, quatre passé 20. */
export const nombreMax = (exercice: ExerciceBilles, a: number) =>
  exercice === "compter" ? (a <= 10 ? 9 : a <= 20 ? 3 : 2) : exercice === "paquets" ? (a <= 20 ? 3 : 2) : exercice === "deux" ? 8 : a <= 20 ? 5 : 4;

/** Des réglages lisibles, quoi qu'on ait gardé : un exercice connu, ses nombres et son nombre d'exercices dans leurs bornes. */
export function reglagesBillesSurs(brut: Partial<ReglagesBilles> | null | undefined): ReglagesBilles {
  const r = { ...REGLAGES_BILLES, ...(brut ?? {}) };
  const ex = EXERCICES_BILLES.find((e) => e.id === r.exercice) ?? EXERCICES_BILLES[3];
  // Deux joueurs ont des nombres différents.
  const [de0, a0] = bornes(r.de, r.a, ex.min, ex.max, ex.defaut, ex.id === "partie" ? 1 : 0);
  return {
    titre: typeof r.titre === "string" ? r.titre : "", exercice: ex.id, de: de0, a: a0,
    nombre: entierLu(r.nombre, ex.nombre.min, nombreMax(ex.id, a0), ex.nombre.defaut), regle: r.regle !== false,
  };
}

/** Le titre de la feuille, quand on n'en a pas écrit. */
export function titreBilles(r: ReglagesBilles): string {
  switch (r.exercice) {
    case "compter": return "Combien de billes ?";
    case "paquets": return r.a <= 19 ? "Un paquet de dix" : "Des paquets de dix";
    case "deux": return "Deux tas de billes";
    case "partie": return "Qui a gagné ?";
  }
}

/** Deux groupes de billes, de part et d'autre d'un trait, par lignes de cinq. */
function svgDeuxGroupes(a: number, b: number): string {
  const r = 2.6, pas = 6.4, l = 5 * pas;
  const groupe = (n: number, x0: number, hex: string) =>
    de(0, n - 1).map((i) => bille(x0 + (i % 5) * pas + r + 0.6, 3.4 + Math.floor(i / 5) * pas, r, hex)).join("");
  return svg(2 * l + 7, 13.2, groupe(a, 0, BLEUES.hex)
    + `<line x1="${n2(l + 3.5)}" y1="0.4" x2="${n2(l + 3.5)}" y2="12.8" stroke="${NOIR}" stroke-width="0.4" stroke-dasharray="1 1"/>` + groupe(b, l + 7, ROUGES.hex));
}

/** Combien de billes ? Jusqu'à 10, de petites boîtes ; au-delà, des cartes d'une couleur chacune — à découper : chaque élève reçoit la sienne. */
function compter(r: ReglagesBilles, alea: () => number, titre: string): string {
  if (r.a <= 10) {
    const boites = tirer(alea, r.de, r.a, r.nombre).map((n, i) => ({ n, hex: COULEURS[i % 3].hex, pts: disperser(alea, n, 3.8, 46.2, 3.8, 24.2, 8.6) }));
    return page(titre, "Je compte les billes de chaque boîte. J'écris le nombre dessous.", (corr) =>
      `<div class="dv-boites">${boites.map((b) => `<div class="dv-boite">${svg(50, 28, b.pts.map((p) => bille(p.x, p.y, 2.8, b.hex)).join(""))}`
        + `<div class="dv-ligne">${rep(corr, b.n)}</div></div>`).join("")}</div>`);
  }
  // Du plus grand au plus petit : de 17 à 19, les trois cartes du manuel — dix-neuf billes bleues, dix-huit rouges, dix-sept vertes.
  const cartes = tirer(alea, r.de, r.a, r.nombre).sort((x, y) => y - x).map((n, i) => ({ c: COULEURS[i % 3], col: collection(alea, n) }));
  return page(titre, "Je compte les billes de ma carte. J'écris combien il y en a.", (corr) => cartes.map(({ c, col }) =>
    `<div class="dv-carte"><div class="dv-carte-titre">Les billes ${c.nom}</div>${svgCollection(col, c.hex, corr)}`
    + `<div class="dv-ligne">Il y a ${rep(corr, col.n)} billes ${c.nom}.${corr && col.n >= 10 ? ` ${majuscule(dizainesEtUnites(col.n))}.` : ""}</div></div>`).join(""),
  r.de === 17 && r.a === 19 ? MANUEL : PROGRAMME);
}

/** Des paquets de dix : entourer, compter ce qui reste, écrire le nombre — dans un tableau, qui ne laisse pas deviner combien de paquets. */
function paquets(r: ReglagesBilles, alea: () => number, titre: string): string {
  const couleurs = melanger(alea, COULEURS);
  const collections = tirer(alea, r.de, r.a, r.nombre).map((n, i) => ({ hex: couleurs[i % 3].hex, col: collection(alea, n) }));
  const tableau = (n: number, corr: boolean) => `<table class="dv-tableau"><tr><th>paquets de dix</th><th>billes seules</th><th>billes en tout</th></tr>`
    + `<tr><td>${rep(corr, Math.floor(n / 10))}</td><td>${rep(corr, n % 10)}</td><td>${rep(corr, n)}</td></tr></table>`;
  return page(titre, "J'entoure des paquets de dix billes. Je compte les billes qui restent seules. J'écris combien il y a de billes en tout.", (corr) =>
    collections.map(({ hex, col }) => `<div class="dv-bloc"><div class="dv-cadre">${svgCollection(col, hex, corr)}</div>${tableau(col.n, corr)}</div>`).join(""));
}

function deuxTas(r: ReglagesBilles, alea: () => number, titre: string): string {
  const paires = tirer(alea, r.de, r.a, r.nombre).map((n) => { const a = entier(alea, 1, n - 1); return { a, b: n - a }; });
  return page(titre, "Je compte les billes de chaque côté du trait. J'écris combien cela fait en tout.", (corr) =>
    paires.map(({ a, b }) => `<div class="dv-rang">${svgDeuxGroupes(a, b)}<span class="dv-ligne">${rep(corr, a)} et ${rep(corr, b)} font ${rep(corr, a + b)}</span></div>`).join(""));
}

function quiAGagne(r: ReglagesBilles, alea: () => number, titre: string): string {
  const liste = parties(alea, r.de, r.a, r.nombre);
  return page(titre, "Un calot vaut dix billes. J'écris combien de billes chaque joueur a gagnées. J'entoure la lettre du gagnant.", (corr) =>
    (r.regle ? regleDuCalot() : "") + liste.map((p, i) => htmlPartie(liste.length > 1 ? `Partie ${i + 1}` : "", p, corr)).join(""),
  r.de <= 10 && r.a === 20 ? MANUEL : PROGRAMME);
}

/** La feuille de l'atelier « Billes et calots », et son corrigé. */
export function htmlBilles(brut: Partial<ReglagesBilles>, graine: number): string {
  const r = reglagesBillesSurs(brut);
  const alea = hasard(graine);
  const titre = r.titre.trim() || titreBilles(r);
  const corps = r.exercice === "compter" ? compter(r, alea, titre) : r.exercice === "paquets" ? paquets(r, alea, titre)
    : r.exercice === "deux" ? deuxTas(r, alea, titre) : quiAGagne(r, alea, titre);
  return feuille(corps, "dv");
}

// ── L'atelier « L'abaque » ────────────────────────────────────────────────

export type PartieAbaque = "echange" | "lire" | "dessiner";

export const PARTIES_ABAQUE: { id: PartieAbaque; libelle: string; consigne: string }[] = [
  { id: "echange", libelle: "L'échange", consigne: "J'échange dix jetons verts contre un jeton rouge. Je dessine les jetons après l'échange. J'écris le nombre." },
  { id: "lire", libelle: "Lire l'abaque", consigne: "J'écris le nombre de chaque abaque." },
  { id: "dessiner", libelle: "Dessiner les jetons", consigne: "Je dessine les jetons de chaque nombre : les rouges sur la tige des dizaines, les verts sur la tige des unités." },
];

export interface ReglagesAbaque {
  titre: string;
  /** Les exercices de la feuille, dans l'ordre. */
  parties: PartieAbaque[];
  de: number; a: number;
  /** Combien d'abaques à lire, et à dessiner. */
  nombre: number;
}

export const REGLAGES_ABAQUE: ReglagesAbaque = { titre: "", parties: ["echange", "lire", "dessiner"], de: 10, a: 20, nombre: 4 };
export const ABAQUES_MAX = 8;

export function reglagesAbaqueSurs(brut: Partial<ReglagesAbaque> | null | undefined): ReglagesAbaque {
  const r = { ...REGLAGES_ABAQUE, ...(brut ?? {}) };
  const parties = PARTIES_ABAQUE.map((p) => p.id).filter((id) => Array.isArray(r.parties) && r.parties.includes(id));
  // Au moins une dizaine à échanger : jusqu'à 11 au moins.
  const [de0, a0] = bornes(r.de, r.a, 1, 99, [10, 20], 3);
  return {
    titre: typeof r.titre === "string" ? r.titre : "", parties: parties.length ? parties : [...REGLAGES_ABAQUE.parties],
    de: de0, a: Math.max(a0, 11), nombre: entierLu(r.nombre, 2, ABAQUES_MAX, 4),
  };
}

export const titreAbaque = (_r: ReglagesAbaque) => "L'abaque à deux tiges";

/**
 * La feuille de l'atelier « L'abaque », et son corrigé. L'échange, jusqu'à
 * 20, est celui du manuel : dix-neuf jetons verts rangés dix et neuf sur les
 * deux tiges, puis dix d'entre eux échangés contre un rouge. Au-delà, dix
 * jetons verts remplissent la tige des unités, et d'autres attendent à côté.
 */
export function htmlAbaque(brut: Partial<ReglagesAbaque>, graine: number): string {
  const r = reglagesAbaqueSurs(brut);
  const alea = hasard(graine);
  const titre = r.titre.trim() || titreAbaque(r);
  const commeLeManuel = r.a <= 20;
  const n = commeLeManuel ? entier(alea, Math.max(11, r.de), Math.min(19, r.a)) : entier(alea, Math.max(10, r.de), r.a);
  const avant: [Jeton[], Jeton[]] = commeLeManuel ? [verts(10), verts(n - 10)] : [Array<Jeton>(Math.floor(n / 10) - 1).fill("rouge"), verts(10)];
  const pile = commeLeManuel ? 0 : n % 10;
  const aLire = tirer(alea, r.de, r.a, r.nombre);
  const autres = de(r.de, r.a).filter((x) => !aLire.includes(x));
  const aDessiner = autres.length >= r.nombre ? melanger(alea, autres).slice(0, r.nombre) : tirer(alea, r.de, r.a, r.nombre);
  const contenu: Record<PartieAbaque, (corr: boolean) => string> = {
    echange: (corr) => `<div class="dv-echange">${svgAbaque(avant, { etiquettes: false, pile })}<div class="dv-fleche">${svgEchange()}</div>`
      + `${svgAbaque(corr ? jetonsDe(n) : aucun)}<div class="dv-ligne">Le nombre : ${rep(corr, n)}</div></div>`,
    lire: (corr) => `<div class="dv-abaques">${aLire.map((x) => `<div>${svgAbaque(jetonsDe(x))}<div class="dv-ligne">${rep(corr, x)}</div></div>`).join("")}</div>`,
    dessiner: (corr) => `<div class="dv-abaques">${aDessiner.map((x) => `<div>${svgAbaque(corr ? jetonsDe(x) : aucun)}<div class="dv-ligne"><b>${x}</b></div></div>`).join("")}</div>`,
  };
  const consigne = (p: PartieAbaque) => PARTIES_ABAQUE.find((x) => x.id === p)!.consigne;
  return feuille(page(titre, "Je regarde la place des jetons : à gauche les dizaines, à droite les unités.",
    (corr) => r.parties.map((p, i) => exo(i + 1, consigne(p), contenu[p](corr))).join(""), commeLeManuel ? MANUEL : PROGRAMME), "dv");
}

// ── L'atelier « La suite des nombres » ────────────────────────────────────

export type ExerciceSuite = "manquants" | "voisins" | "ranger" | "plusGrand" | "formes" | "relier" | "dizaines" | "dessiner";

export const EXERCICES_SUITE: { id: ExerciceSuite; libelle: string; consigne: string }[] = [
  { id: "manquants", libelle: "La frise à compléter", consigne: "J'écris les nombres qui manquent sur chaque frise." },
  { id: "voisins", libelle: "Juste avant, juste après", consigne: "J'écris le nombre qui vient juste avant, et celui qui vient juste après." },
  { id: "plusGrand", libelle: "Le plus grand des deux", consigne: "J'entoure le plus grand nombre de chaque paire." },
  { id: "formes", libelle: "Comparer : mots, abaques, calots", consigne: "J'entoure celui qui montre le plus grand nombre." },
  { id: "ranger", libelle: "Ranger", consigne: "Je range les nombres du plus petit au plus grand." },
  { id: "relier", libelle: "Le nom des nombres", consigne: "Je relie chaque nom à son nombre." },
  { id: "dizaines", libelle: "Dizaines et unités", consigne: "J'écris combien je vois de dizaines et d'unités, puis le nombre." },
  { id: "dessiner", libelle: "Dessiner les barres et les cubes", consigne: "Je dessine les barres de dix et les cubes de chaque nombre." },
];

export interface ReglagesSuite {
  titre: string;
  /** Les exercices de la feuille, dans l'ordre du catalogue. */
  exercices: ExerciceSuite[];
  de: number; a: number;
}

export const REGLAGES_SUITE: ReglagesSuite = { titre: "", exercices: ["manquants", "voisins"], de: 1, a: 20 };

export function reglagesSuiteSurs(brut: Partial<ReglagesSuite> | null | undefined): ReglagesSuite {
  const r = { ...REGLAGES_SUITE, ...(brut ?? {}) };
  const exercices = EXERCICES_SUITE.map((e) => e.id).filter((id) => Array.isArray(r.exercices) && r.exercices.includes(id));
  // Au moins six nombres : de quoi ranger cinq nombres, en relier six.
  const [de0, a0] = bornes(r.de, r.a, 0, 100, [1, 20], 5);
  return { titre: typeof r.titre === "string" ? r.titre : "", exercices: exercices.length ? exercices : [...REGLAGES_SUITE.exercices], de: de0, a: a0 };
}

/** Le titre de la feuille, d'après ses exercices : « La frise jusqu'à 20 », « Comparer et ranger de 10 à 20 ». */
export function titreSuite(r: ReglagesSuite): string {
  const b = r.de <= 1 ? `jusqu'à ${r.a}` : `de ${r.de} à ${r.a}`;
  const seulement = (...ids: ExerciceSuite[]) => r.exercices.every((e) => ids.includes(e));
  if (seulement("relier", "dizaines", "dessiner")) return `De ${r.de} à ${r.a} : le nom et l'écriture`;
  if (seulement("manquants", "voisins")) return `La frise ${b}`;
  if (seulement("plusGrand", "formes", "ranger")) return `Comparer et ranger ${b}`;
  return `La suite des nombres ${b}`;
}

type Representation = "chiffres" | "lettres" | "unites" | "abaque" | "calots";

/** Un nombre sous une forme ; l'abaque et les calots s'arrêtent à 99. */
function representer(n: number, sorte: Representation): string {
  const d = Math.floor(n / 10), u = n % 10;
  switch (n > 99 && (sorte === "abaque" || sorte === "calots") ? "chiffres" : sorte) {
    case "lettres": return `<span class="dv-mot">${nombreEnLettres(n)}</span>`;
    case "unites": return `<span class="dv-mot">${d} dizaine${d > 1 ? "s" : ""} et ${u} unité${u > 1 ? "s" : ""}</span>`;
    case "abaque": return svgAbaque(jetonsDe(n), { echelle: 0.66 });
    case "calots": return svgJeu({ calots: d, billes: u }, { parRang: 5, calotsParRang: 5, echelle: d > 2 ? 0.6 : 0.8 });
    default: return `<span class="dv-gros">${n}</span>`;
  }
}

/**
 * Les frises : vingt nombres qui se suivent, ou moins s'il n'y en a pas
 * autant. La première, quand elle commence après une dizaine entière, est
 * celle du manuel : les nombres en 7, 8, 9 et la dizaine qui suit manquent
 * — on les entend dans dix-sept, dix-huit, dix-neuf.
 */
function frises(alea: () => number, r: ReglagesSuite): { debut: number; fin: number; trous: number[] }[] {
  const longueur = Math.min(20, r.a - r.de + 1);
  const debuts = de(r.de, r.a - longueur + 1);
  const commeLeManuel = longueur === 20 ? debuts.filter((s) => s % 10 === 1) : [];
  const premiere = commeLeManuel.length ? commeLeManuel[Math.floor(alea() * commeLeManuel.length)] : null;
  return [6, 6, 8, 10].map((combien, i) => {
    if (i === 0 && premiere !== null) return { debut: premiere, fin: premiere + 19, trous: [6, 7, 8, 9, 16, 17, 18].map((k) => premiere + k) };
    const debut = debuts[Math.floor(alea() * debuts.length)];
    return { debut, fin: debut + longueur - 1, trous: trousDeLaFrise(alea, debut, debut + longueur - 1, Math.min(combien, longueur - 2)) };
  });
}

/** La feuille de l'atelier « La suite des nombres », et son corrigé. */
export function htmlSuite(brut: Partial<ReglagesSuite>, graine: number): string {
  const r = reglagesSuiteSurs(brut);
  const alea = hasard(graine);
  const titre = r.titre.trim() || titreSuite(r);
  const lesFrises = frises(alea, r);
  const voisins = tirer(alea, r.de + 1, r.a - 1, 6);
  const listes = [0, 1].map(() => tirer(alea, r.de, r.a, 5));
  const deux = () => tirer(alea, r.de, r.a, 2) as [number, number];
  const chiffres = de(1, 6).map(deux);
  const sortes: [Representation, Representation][] = [["abaque", "chiffres"], ["calots", "lettres"], ["unites", "abaque"], ["lettres", "calots"]];
  const paires = sortes.map(([s, t]) => { const [x, y] = deux(); return { x, y, s, t }; });
  const noms = tirer(alea, r.de, r.a, 6);
  const droite = melanger(alea, noms);
  const [dessins, aDessiner] = ((l: number[]) => [l.slice(0, 4), l.slice(4, 6)])(tirer(alea, r.de, r.a, 6));
  const entoure = (corr: boolean, oui: boolean) => (corr && oui ? " dv-gagne" : "");
  const hauteur = 10 + 5.4 * Math.max(...aDessiner.map((n) => Math.floor(n / 10)));
  const contenu: Record<ExerciceSuite, (corr: boolean) => string> = {
    manquants: (corr) => lesFrises.map((f) => frise(f.debut, f.fin, f.trous, corr)).join(""),
    voisins: (corr) => `<div class="dv-voisins">${voisins.map((n) => `<div>${rep(corr, n - 1)} <b class="dv-gros">${n}</b> ${rep(corr, n + 1)}</div>`).join("")}</div>`,
    ranger: (corr) => listes.map((l) => `<div class="dv-ranger"><div class="dv-a-ranger">${l.map((n) => `<span>${n}</span>`).join("")}</div>`
      + `<div class="dv-cases">${[...l].sort((x, y) => x - y).map((n) => `<span class="dv-case">${corr ? n : ""}</span>`).join("")}</div></div>`).join(""),
    plusGrand: (corr) => `<div class="dv-paires-chiffres">${chiffres.map(([x, y]) => `<div class="dv-paire-n"><span class="dv-n${entoure(corr, x > y)}">${x}</span>`
      + `<span class="dv-n${entoure(corr, y > x)}">${y}</span></div>`).join("")}</div>`,
    formes: (corr) => `<div class="dv-paires">${paires.map((p) => `<div class="dv-paire"><div class="dv-repr${entoure(corr, p.x > p.y)}">${representer(p.x, p.s)}</div>`
      + `<span class="dv-ou">ou</span><div class="dv-repr${entoure(corr, p.y > p.x)}">${representer(p.y, p.t)}</div></div>`).join("")}</div>`,
    relier: (corr) => relier(noms, droite, corr),
    dizaines: (corr) => `<table class="dv-tableau"><tr><th></th><th>dizaines</th><th>unités</th><th>le nombre</th></tr>`
      + dessins.map((n) => `<tr><td class="dv-gauche">${svgBarresEtCubes(Math.floor(n / 10), n % 10)}</td><td>${rep(corr, Math.floor(n / 10))}</td>`
        + `<td>${rep(corr, n % 10)}</td><td>${rep(corr, n)}</td></tr>`).join("") + "</table>",
    dessiner: (corr) => `<div class="dv-dessiner-rang">${aDessiner.map((n) => `<div class="dv-dessiner" style="min-height:${n2(hauteur)}mm"><b>${n}</b>`
      + `${corr ? svgBarresEtCubes(Math.floor(n / 10), n % 10) : ""}</div>`).join("")}</div>`,
  };
  const consigne = (e: ExerciceSuite) => EXERCICES_SUITE.find((x) => x.id === e)!.consigne;
  const seul = r.exercices.length === 1;
  return feuille(page(titre, seul ? consigne(r.exercices[0]) : "Je fais les exercices dans l'ordre.",
    (corr) => r.exercices.map((e, i) => (seul ? `<div class="dv-exo">${contenu[e](corr)}</div>` : exo(i + 1, consigne(e), contenu[e](corr)))).join(""),
    r.de <= 1 && r.a === 20 && r.exercices.includes("manquants") ? MANUEL : PROGRAMME), "dv");
}

// ── L'évaluation de la séquence ───────────────────────────────────────────

/** L'évaluation de la séquence « La connaissance des nombres de 10 à 20 » : tout ce qu'elle a travaillé, sur une feuille. */
export function htmlEvaluationDixAVingt(graine: number): string {
  const alea = hasard(graine);
  const col = collection(alea, entier(alea, 15, 19));
  const abaques = tirer(alea, 10, 20, 3);
  const [partie] = parties(alea, 10, 20, 1);
  const trous = trousDeLaFrise(alea, 1, 20, 7);
  // À dicter : un de 17 à 19, un de 11 à 16, dix ou vingt, et un autre.
  const dictee = (() => {
    const a = entier(alea, 17, 19), b = entier(alea, 11, 16), c = alea() < 0.5 ? 10 : 20;
    const d = melanger(alea, de(11, 19).filter((x) => x !== a && x !== b))[0];
    return melanger(alea, [a, b, c, d]);
  })();
  const noms = melanger(alea, [...melanger(alea, de(11, 16)).slice(0, 2), ...melanger(alea, de(17, 19)).slice(0, 2)]);
  const droite = melanger(alea, noms);
  const titre = "Évaluation — les nombres de 10 à 20";
  return feuille(page(titre, "Je fais les exercices dans l'ordre. Je relis mes réponses.", (corr) => exo(1, "Je compte les billes. J'écris combien il y en a.",
    `<div class="dv-cadre">${svgCollection(col, VERTES.hex, corr)}</div><div class="dv-ligne">Il y a ${rep(corr, col.n)} billes.</div>`)
    + exo(2, "J'écris le nombre de chaque abaque.",
      `<div class="dv-abaques dv-trois">${abaques.map((x) => `<div>${svgAbaque(jetonsDe(x))}<div class="dv-ligne">${rep(corr, x)}</div></div>`).join("")}</div>`)
    + exo(3, "Un calot vaut dix billes. J'écris combien de billes chaque joueur a gagnées. J'entoure la lettre du gagnant.", htmlPartie("", partie, corr))
    + exo(4, "J'écris les nombres qui manquent sur la frise.", frise(1, 20, trous, corr))
    + exo(5, "J'écris en chiffres les nombres que j'entends.",
      (corr ? `<div class="dv-adulte">À dicter : ${dictee.map(nombreEnLettres).join(", ")}.</div>` : "")
        + `<div class="dv-dictee">${dictee.map((x) => `<span>${corr ? x : ""}</span>`).join("")}</div>`)
    + exo(6, "Je relie chaque nom à son nombre.", relier(noms, droite, corr))), "dv");
}

export const STYLE_NUMERATION_CP = `
  .feuille.dv svg { display: block; }
  .feuille.dv .dv-exo { break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-consigne { font-size: 13.5px; font-weight: 700; margin: 5mm 0 2mm; }
  .feuille.dv .dv-blanc { display: inline-block; width: 16mm; height: 6mm; border-bottom: 2px dotted #1c2233; vertical-align: bottom; }
  .feuille.dv .dv-rep { color: #2f6fd1; }
  .feuille.dv .dv-ligne { font-size: 14px; line-height: 2; margin: 1mm 0 0; }
  .feuille.dv .dv-espace { margin-left: 7mm; }
  .feuille.dv .dv-bloc { margin: 0 0 4mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.dv .dv-bloc .dv-tableau { margin-top: 2mm; }
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
    border-radius: 50%; font-weight: 800; font-size: 14px; line-height: 1; vertical-align: middle; flex: none; }
  .feuille.dv .dv-lettre.dv-gagne { border: 2.4px solid #d64545; }
  .feuille.dv .dv-echange { display: flex; align-items: center; gap: 4mm; margin: 0 0 2mm; }
  .feuille.dv .dv-abaques { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm 3mm; text-align: center; }
  .feuille.dv .dv-abaques .dv-ligne { line-height: 1.6; margin: 0.5mm 0 0; }
  .feuille.dv .dv-abaques.dv-trois { grid-template-columns: repeat(3, 1fr); }
  .feuille.dv table.dv-frise, .feuille.dv table.dv-tableau { width: auto; }
  .feuille.dv .dv-frise { border-collapse: collapse; margin: 0 auto 4mm; font-size: 14px; }
  .feuille.dv .dv-frise.dv-frise-cent { font-size: 12px; }
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
  .feuille.dv .dv-paires { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 6mm; }
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
