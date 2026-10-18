// Les cartes des feuilles d'histoire-géographie du cours moyen.
//
// Programme d'histoire-géographie du cycle 3 (BO n° 22 du 28 mai 2026,
// annexe 4) : se repérer dans l'espace, c'est localiser sur le planisphère,
// sur la carte de l'Europe, sur la carte de France les lieux des thèmes — les
// régions, les fleuves, les massifs, les villes —, et lire, compléter,
// construire une carte et sa légende. Un fond (fondsDeCarte.ts, d'après
// Natural Earth, domaine public) et ce que l'exercice y met : des numéros à
// nommer, des pays à colorier, des points, des traits — des flèches, des
// câbles, des routes — ; la carte de l'élève, puis celle du corrigé. Les
// numéros se placent seuls : celui qui en gêne un autre s'écarte, relié à sa
// place par un trait fin.

import { escapeHtml } from "./print";
import { hasard, melanger } from "./hasard";
import { FOND_EUROPE, FOND_FRANCE, FOND_MONDE, type FondDeCarte, type ProjectionDeCarte } from "./fondsDeCarte";

export type NomDuFond = "monde" | "europe" | "france";
export const FONDS_DE_CARTE: Record<NomDuFond, FondDeCarte> = { monde: FOND_MONDE, europe: FOND_EUROPE, france: FOND_FRANCE };

// ── Les lieux ─────────────────────────────────────────────────────────────

/** Un lieu : son nom, sa longitude, sa latitude ; sur la carte de France, l'encart de l'outre-mer où il se trouve. */
export interface LieuDeCarte { nom: string; lon: number; lat: number; encart?: string }
const lieu = (nom: string, lon: number, lat: number, encart?: string): LieuDeCarte => (encart ? { nom, lon, lat, encart } : { nom, lon, lat });

export const LIEUX_DES_CARTES: Record<string, LieuDeCarte> = {
  // L'Hexagone : les capitales des régions, des villes, deux lacs.
  paris: lieu("Paris", 2.3522, 48.8566), lyon: lieu("Lyon", 4.8357, 45.764), marseille: lieu("Marseille", 5.3698, 43.2965), lille: lieu("Lille", 3.0573, 50.6292),
  toulouse: lieu("Toulouse", 1.4442, 43.6047), bordeaux: lieu("Bordeaux", -0.5792, 44.8378), nantes: lieu("Nantes", -1.5536, 47.2184),
  strasbourg: lieu("Strasbourg", 7.7521, 48.5734), rennes: lieu("Rennes", -1.6778, 48.1173), dijon: lieu("Dijon", 5.0415, 47.322), orleans: lieu("Orléans", 1.9093, 47.903),
  ajaccio: lieu("Ajaccio", 8.7369, 41.9192), rouen: lieu("Rouen", 1.0993, 49.4432), nice: lieu("Nice", 7.262, 43.7102), montpellier: lieu("Montpellier", 3.8767, 43.6108),
  "lac-du-bourget": lieu("le lac du Bourget", 5.8667, 45.7333), "lac-de-serre-poncon": lieu("le lac de Serre-Ponçon", 6.35, 44.5167),
  // L'outre-mer : la capitale de chaque région, sur son encart.
  "basse-terre": lieu("Basse-Terre", -61.7259, 15.9985, "GLP"), "fort-de-france": lieu("Fort-de-France", -61.0588, 14.6161, "MTQ"),
  cayenne: lieu("Cayenne", -52.335, 4.9224, "GUF"), "saint-denis": lieu("Saint-Denis", 55.4504, -20.8823, "REU"), mamoudzou: lieu("Mamoudzou", 45.2279, -12.7806, "MYT"),
  "saint-laurent-du-maroni": lieu("Saint-Laurent-du-Maroni", -54.029, 5.4983, "GUF"),
  // L'Europe : les capitales de l'Union européenne, et Londres.
  berlin: lieu("Berlin", 13.405, 52.52), bruxelles: lieu("Bruxelles", 4.3517, 50.8503), rome: lieu("Rome", 12.4964, 41.9028), luxembourg: lieu("Luxembourg", 6.1296, 49.8153),
  amsterdam: lieu("Amsterdam", 4.9041, 52.3676), vienne: lieu("Vienne", 16.3738, 48.2082), sofia: lieu("Sofia", 23.3219, 42.6977), nicosie: lieu("Nicosie", 33.3823, 35.1856),
  zagreb: lieu("Zagreb", 15.9819, 45.815), copenhague: lieu("Copenhague", 12.5683, 55.6761), madrid: lieu("Madrid", -3.7038, 40.4168), tallinn: lieu("Tallinn", 24.7536, 59.437),
  helsinki: lieu("Helsinki", 24.9384, 60.1699), athenes: lieu("Athènes", 23.7275, 37.9838), budapest: lieu("Budapest", 19.0402, 47.4979), dublin: lieu("Dublin", -6.2603, 53.3498),
  riga: lieu("Riga", 24.1052, 56.9496), vilnius: lieu("Vilnius", 25.2797, 54.6872), "la-valette": lieu("La Valette", 14.5146, 35.8989), varsovie: lieu("Varsovie", 21.0122, 52.2297),
  lisbonne: lieu("Lisbonne", -9.1393, 38.7223), bucarest: lieu("Bucarest", 26.1025, 44.4268), bratislava: lieu("Bratislava", 17.1077, 48.1486),
  ljubljana: lieu("Ljubljana", 14.5058, 46.0569), stockholm: lieu("Stockholm", 18.0686, 59.3293), prague: lieu("Prague", 14.4378, 50.0755), londres: lieu("Londres", -0.1276, 51.5072),
  // Le monde.
  "new-york": lieu("New York", -74.006, 40.7128), "los-angeles": lieu("Los Angeles", -118.2437, 34.0522), tokyo: lieu("Tokyo", 139.6917, 35.6895),
  dakar: lieu("Dakar", -17.4677, 14.7167), montreal: lieu("Montréal", -73.5673, 45.5017), "le-caire": lieu("Le Caire", 31.2357, 30.0444), pekin: lieu("Pékin", 116.4074, 39.9042),
  "rio-de-janeiro": lieu("Rio de Janeiro", -43.1729, -22.9068), sydney: lieu("Sydney", 151.2093, -33.8688), lagos: lieu("Lagos", 3.3792, 6.5244), mexico: lieu("Mexico", -99.1332, 19.4326),
  bombay: lieu("Bombay", 72.8777, 19.076), singapour: lieu("Singapour", 103.8198, 1.3521), fortaleza: lieu("Fortaleza", -38.5434, -3.7319),
  "port-said": lieu("Port-Saïd", 32.3019, 31.2653), djibouti: lieu("Djibouti", 43.145, 11.5721), "le-cap": lieu("Le Cap", 18.4241, -33.9249), luanda: lieu("Luanda", 13.2344, -8.8383),
  mombasa: lieu("Mombasa", 39.6682, -4.0435), perth: lieu("Perth", 115.8605, -31.9505), "hong-kong": lieu("Hong Kong", 114.1694, 22.3193),
  valparaiso: lieu("Valparaíso", -71.6127, -33.0472), sines: lieu("Sines", -8.8698, 37.9561), "virginia-beach": lieu("Virginia Beach", -75.978, 36.8529),
  "saint-hilaire-de-riez": lieu("Saint-Hilaire-de-Riez", -1.9456, 46.7208), bude: lieu("Bude", -4.5432, 50.8296), mtunzini: lieu("Mtunzini", 31.7486, -28.9519),
  // L'histoire : les ports du commerce triangulaire, les premières colonies.
  goree: lieu("Gorée", -17.3983, 14.6672), "saint-domingue": lieu("Saint-Domingue", -72.2, 19.76), quebec: lieu("Québec", -71.2082, 46.8139),
  jamestown: lieu("Jamestown", -76.7775, 37.2097),
  // Les deux guerres mondiales.
  verdun: lieu("Verdun", 5.3844, 49.1598), vichy: lieu("Vichy", 3.4264, 46.1278), "chambon-sur-lignon": lieu("Le Chambon-sur-Lignon", 4.3017, 45.0611),
};

// ── Les projections ───────────────────────────────────────────────────────

const RAD = Math.PI / 180;

/** La projection du fond (celle de outils/fonds-de-carte.mjs), avant son échelle. */
function projectionBrute(p: ProjectionDeCarte, lon: number, lat: number): [number, number] {
  if (p.sorte === "equal-earth") {
    const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
    const l = lon * RAD, t = Math.asin(M * Math.sin(lat * RAD)), t2 = t * t, t6 = t2 * t2 * t2;
    const x = (2 * Math.sqrt(3) * l * Math.cos(t)) / (3 * (9 * A4 * t6 * t2 + 7 * A3 * t6 + 3 * A2 * t2 + A1));
    return [x, -(A4 * t6 * t2 * t + A3 * t6 * t + A2 * t2 * t + A1 * t)];
  }
  const l = (lon - (p.lon0 ?? 0)) * RAD, f = lat * RAD, f0 = (p.lat0 ?? 0) * RAD;
  const k = Math.sqrt(2 / (1 + Math.sin(f0) * Math.sin(f) + Math.cos(f0) * Math.cos(f) * Math.cos(l)));
  return [k * Math.cos(f) * Math.sin(l), -k * (Math.cos(f0) * Math.sin(f) - Math.sin(f0) * Math.cos(f) * Math.cos(l))];
}

/** Un point du globe sur le fond — sur l'encart qu'on nomme, pour l'outre-mer de la carte de France. */
export function projeter(fond: FondDeCarte, [lon, lat]: [number, number], encart?: string): [number, number] {
  const p = (encart && fond.cadres?.find((c) => c.id === encart)?.projection) || fond.projection;
  const [x, y] = projectionBrute(p, lon, lat);
  return [p.dx + p.k * x, p.dy + p.k * y];
}

// ── Ce qu'un exercice met sur la carte ────────────────────────────────────

/** Un point de la carte : un lieu de LIEUX_DES_CARTES, ou une longitude et une latitude. */
export type PointDeCarte = string | [number, number];

/**
 * Ce qu'on numérote : un pays ou une région du fond, un fleuve, un massif, un
 * lieu ; ou, avec `ou`, une étendue — un océan, une chaîne de montagnes, une
 * aire —, sans point. `nom` : ce qu'on attend, avec son article.
 */
export interface NumeroDeCarte { quoi?: string; ou?: [number, number]; nom: string }

/** Des traits d'une même sorte : des flèches, des câbles, des routes, des lignes à grande vitesse. */
export interface TraitsDeCarte {
  sorte: "fleche" | "cable" | "route" | "lgv" | "limite" | "frontiere";
  /** Ce que la légende en dit. */
  legende: string;
  /** À tracer par l'élève : seul le corrigé les montre ; la légende, si. */
  aTracer?: boolean;
  /** Chaque trait : ses points ; son nom, écrit dessus au corrigé ; ce qu'on y écrit, désigné par une lettre ; un décalage sur le côté, en mm. */
  liste: { par: PointDeCarte[]; nom?: string; texte?: string; decalage?: number }[];
}

export interface CarteHGCM {
  fond: NomDuFond;
  /** La partie du fond qu'on montre : ouest, sud, est, nord, en degrés. */
  cadrage?: [number, number, number, number];
  /** La hauteur de la carte sur la page, en mm, au plus : moins, quand la légende et les noms prennent de la place dessous. */
  hauteur?: number;
  /** Les pays ou les régions à colorier, groupe par groupe : la case de la légende reste blanche chez l'élève. « @europe » : les pays du continent européen. */
  colorier?: { nom: string; couleur: string; formes: string[] }[];
  numeros?: NumeroDeCarte[];
  /** Ce que la légende dit des lieux numérotés : « une grande agglomération ». */
  legendeNumeros?: string;
  /** Des lieux marqués d'un point, sans leur nom : les capitales des régions. */
  points?: { legende: string; lieux: string[] };
  /** Des lieux marqués d'un point et nommés : des repères. */
  reperes?: string[];
  /** Des noms écrits sur la carte : les continents. */
  textes?: { ou: [number, number]; texte: string }[];
  traits?: TraitsDeCarte[];
  fleuves?: boolean;
  massifs?: boolean;
  /** Le continent européen dans ses limites conventionnelles, teinté. */
  continent?: boolean;
  /**
   * Des zones à colorier qui ne suivent pas les frontières — la zone occupée
   * de 1940 — : leur contour en longitude et latitude, coupé à la terre du
   * fond (l'Hexagone, pour la carte de France). Le corrigé les colorie ; la
   * case de la légende reste blanche chez l'élève.
   */
  aplats?: { nom: string; couleur: string; contour: [number, number][] }[];
  /** Les noms à écrire, dans le désordre, au-dessus de la liste. */
  banque?: boolean;
  /** Une remarque sous la carte : les frontières d'aujourd'hui, un schéma. */
  note?: string;
}

/** Le planisphère entier se met en paysage : il y gagne de la place. */
export const carteEnPaysage = (c: CarteHGCM) => c.fond === "monde" && !c.cadrage;

/** Les formes d'un groupe à colorier : « @europe » vaut tous les pays du continent européen. */
export const formesDuGroupe = (fond: FondDeCarte, formes: string[]): string[] =>
  formes.flatMap((id) => (id === "@europe" ? fond.formes.filter((f) => f.europe).map((f) => f.id) : [id]));

/** Ce qu'un numéro désigne sur le fond, et où le poser : une forme, un fleuve, un massif, un lieu ; null s'il n'existe pas. */
export function placeDuNumero(fond: FondDeCarte, n: NumeroDeCarte): { x: number; y: number; point: boolean } | null {
  if (n.ou) { const [x, y] = projeter(fond, n.ou); return { x, y, point: false }; }
  if (!n.quoi) return null;
  const forme = [...fond.formes, ...(fond.lignes ?? []), ...(fond.zones ?? [])].find((f) => f.id === n.quoi);
  if (forme?.centre) return { x: forme.centre[0], y: forme.centre[1], point: false };
  const l = LIEUX_DES_CARTES[n.quoi];
  if (!l) return null;
  const [x, y] = projeter(fond, [l.lon, l.lat], l.encart);
  return { x, y, point: true };
}

// ── Le dessin ─────────────────────────────────────────────────────────────

const MER = "#e6f0f9", TERRE = "#ffffff", BORD = "#4a5060", ENCRE = "#1c2233", GRIS = "#687087";
const STYLE_TRAIT: Record<TraitsDeCarte["sorte"], { couleur: string; eleve?: string; epaisseur: number; tirets?: [number, number] }> = {
  fleche: { couleur: ENCRE, epaisseur: 0.55 },
  cable: { couleur: "#c0392b", eleve: "#8a90a0", epaisseur: 0.4 },
  route: { couleur: "#d8342c", epaisseur: 0.75 },
  lgv: { couleur: "#2563c9", epaisseur: 0.65, tirets: [1.8, 1.1] },
  limite: { couleur: "#b3261e", eleve: "#8a90a0", epaisseur: 0.9 },
  frontiere: { couleur: "#4a5060", epaisseur: 0.5, tirets: [1.4, 0.9] },
};
const FLEUVE = { couleur: "#1f6fd1", eleve: "#9db8d8" };
const MASSIF = { couleur: "#b08968", bord: "#7a5c3e" };
/** Le rayon d'un numéro, celui d'un point, en mm. */
const RAYON = 2.3, POINT = 0.9;

const num = (v: number) => String(Math.round(v * 100) / 100);
const lettre = (i: number) => String.fromCharCode(65 + i);

/** La partie du fond qu'on montre, en unités du fond : le cadrage projeté, ou tout le fond. */
export function cadreDeLaCarte(c: CarteHGCM): [number, number, number, number] {
  const fond = FONDS_DE_CARTE[c.fond];
  if (!c.cadrage) return [0, 0, fond.largeur, fond.hauteur];
  const [o, s, e, n] = c.cadrage;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push(projeter(fond, [o + t * (e - o), s]), projeter(fond, [o + t * (e - o), n]), projeter(fond, [o, s + t * (n - s)]), projeter(fond, [e, s + t * (n - s)]));
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.max(0, Math.min(...xs)), y0 = Math.max(0, Math.min(...ys));
  return [x0, y0, Math.min(fond.largeur, Math.max(...xs)) - x0, Math.min(fond.hauteur, Math.max(...ys)) - y0];
}

/** La mer : le contour du globe pour le planisphère, un rectangle ailleurs ; les encarts de l'outre-mer, chacun le sien. */
function mer(fond: FondDeCarte, k: number): string {
  if (fond.projection.sorte === "equal-earth") {
    const bord: [number, number][] = [];
    for (let lat = 90; lat >= -90; lat -= 5) bord.push([-180, lat]);
    for (let lon = -180; lon <= 180; lon += 10) bord.push([lon, -90]);
    for (let lat = -90; lat <= 90; lat += 5) bord.push([180, lat]);
    for (let lon = 180; lon >= -180; lon -= 10) bord.push([lon, 90]);
    return `<path fill="${MER}" stroke="${BORD}" stroke-width="${num(0.3 * k)}" d="M${bord.map((p) => projeter(fond, p).map(num).join(" ")).join("L")}z"/>`;
  }
  return `<rect fill="${MER}" x="0" y="0" width="${fond.largeur}" height="${fond.hexagone ?? fond.hauteur}"/>`
    + (fond.cadres ?? []).map((c) => `<rect fill="${MER}" x="${c.x}" y="${c.y}" width="${c.l}" height="${c.h}"/>`).join("");
}

/** Un trait sur le fond : ses morceaux, coupés là où il passe d'un bord du planisphère à l'autre, par pas de deux degrés au plus. */
function morceauxDuTrait(fond: FondDeCarte, par: PointDeCarte[]): [number, number][][] {
  const pts = par.map((p): [number, number] => (typeof p === "string" ? [LIEUX_DES_CARTES[p].lon, LIEUX_DES_CARTES[p].lat] : p));
  // Tout un trait sur un encart de l'outre-mer s'y dessine ; sinon, sur le fond.
  const encarts = new Set(par.map((p) => (typeof p === "string" ? LIEUX_DES_CARTES[p].encart : undefined)));
  const encart = encarts.size === 1 ? [...encarts][0] : undefined;
  const monde = fond.projection.sorte === "equal-earth";
  // Les longitudes déroulées : d'un point au suivant, on passe par le plus court, quitte à franchir le bord.
  const u = [pts[0][0]];
  for (let i = 1; i < pts.length; i++) {
    let d = pts[i][0] - pts[i - 1][0];
    if (monde) { if (d > 180) d -= 360; if (d < -180) d += 360; }
    u.push(u[i - 1] + d);
  }
  const suite: [number, number][] = [[u[0], pts[0][1]]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(u[i + 1] - u[i]), Math.abs(pts[i + 1][1] - pts[i][1])) / 2));
    for (let s = 1; s <= n; s++) suite.push([u[i] + (s / n) * (u[i + 1] - u[i]), pts[i][1] + (s / n) * (pts[i + 1][1] - pts[i][1])]);
  }
  const tour = (v: number) => (monde ? Math.floor((v + 180) / 360) : 0);
  const ramener = (v: number) => v - 360 * tour(v);
  const morceaux: [number, number][][] = [];
  let courant: [number, number][] = [projeter(fond, [ramener(suite[0][0]), suite[0][1]], encart)];
  for (let j = 1; j < suite.length; j++) {
    const [a, la] = suite[j - 1], [b, lb] = suite[j];
    if (tour(a) !== tour(b)) {
      // Le passage du bord : le morceau finit sur un bord, le suivant reprend sur l'autre.
      const bord = 180 + 360 * Math.min(tour(a), tour(b)), f = (bord - a) / (b - a), lat = la + f * (lb - la), sortie = b > a ? 180 : -180;
      courant.push(projeter(fond, [sortie, lat]));
      morceaux.push(courant);
      courant = [projeter(fond, [-sortie, lat])];
    }
    courant.push(projeter(fond, [ramener(b), lb], encart));
  }
  morceaux.push(courant);
  return morceaux.filter((m) => m.length > 1);
}

/** Un trait décalé sur le côté de `d` unités : chaque point suit la normale de ses segments. */
function decaler(points: [number, number][], d: number): [number, number][] {
  if (!d) return points;
  return points.map(([x, y], i) => {
    const [ax, ay] = points[Math.max(0, i - 1)], [bx, by] = points[Math.min(points.length - 1, i + 1)];
    const l = Math.hypot(bx - ax, by - ay) || 1;
    return [x - ((by - ay) / l) * d, y + ((bx - ax) / l) * d];
  });
}

/** Un trait raccourci aux deux bouts de `r` unités : une flèche ne cache pas le point d'où elle part, ni celui où elle arrive. */
function raccourcir(points: [number, number][], r: number): [number, number][] {
  const p = [...points];
  const rogner = (a: [number, number], b: [number, number]): [number, number] => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return l <= r ? a : [a[0] + ((b[0] - a[0]) / l) * r, a[1] + ((b[1] - a[1]) / l) * r];
  };
  if (p.length > 1) { p[0] = rogner(p[0], p[1]); p[p.length - 1] = rogner(p[p.length - 1], p[p.length - 2]); }
  return p;
}

/** Le milieu d'un trait, en suivant sa longueur. */
function milieu(points: [number, number][]): [number, number] {
  const longueurs = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let reste = longueurs.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < longueurs.length; i++) {
    if (reste <= longueurs[i]) { const t = reste / (longueurs[i] || 1); return [points[i][0] + t * (points[i + 1][0] - points[i][0]), points[i][1] + t * (points[i + 1][1] - points[i][1])]; }
    reste -= longueurs[i];
  }
  return points[points.length - 1];
}

const chemin = (points: [number, number][]) => `M${points.map((p) => p.map(num).join(" ")).join("L")}`;

interface Pastille { x: number; y: number; ax: number; ay: number; texte: string; point: boolean }

/**
 * Les numéros, sans qu'ils se chevauchent ni ne cachent un point : chacun
 * s'écarte de ce qui le gêne, tiré vers sa place, et reste dans le cadre.
 */
function ecarter(pastilles: Pastille[], obstacles: [number, number][], r: number, k: number, vb: [number, number, number, number]) {
  const voulu = pastilles.map((p) => [p.x, p.y]);
  const ecart = 2 * r + 0.6 * k, autourDUnPoint = r + (POINT + 0.4) * k;
  for (let tour = 0; tour < 150; tour++) {
    for (let i = 0; i < pastilles.length; i++) {
      const a = pastilles[i];
      for (let j = i + 1; j < pastilles.length; j++) {
        const b = pastilles[j];
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= ecart) continue;
        if (d < 1e-6) { dx = Math.cos(i + j); dy = Math.sin(i + j); d = 1; }
        const pousse = (ecart - d) / 2 + 0.01;
        a.x -= (dx / d) * pousse; a.y -= (dy / d) * pousse; b.x += (dx / d) * pousse; b.y += (dy / d) * pousse;
      }
      for (const [ox, oy] of obstacles) {
        let dx = a.x - ox, dy = a.y - oy, d = Math.hypot(dx, dy);
        if (d >= autourDUnPoint) continue;
        if (d < 1e-6) { dx = 1; dy = -1; d = Math.SQRT2; }
        a.x += (dx / d) * (autourDUnPoint - d + 0.01); a.y += (dy / d) * (autourDUnPoint - d + 0.01);
      }
      a.x += (voulu[i][0] - a.x) * 0.04; a.y += (voulu[i][1] - a.y) * 0.04;
      a.x = Math.min(vb[0] + vb[2] - r, Math.max(vb[0] + r, a.x)); a.y = Math.min(vb[1] + vb[3] - r, Math.max(vb[1] + r, a.y));
    }
  }
}

/** La taille de la carte sur la page, en mm, et le nombre d'unités du fond par mm. */
export function tailleDeLaCarte(c: CarteHGCM, largeurMax: number, hauteurMax: number) {
  const vb = cadreDeLaCarte(c);
  let largeur = largeurMax, hauteur = (largeurMax * vb[3]) / vb[2];
  if (hauteur > hauteurMax) { hauteur = hauteurMax; largeur = (hauteur * vb[2]) / vb[3]; }
  return { vb, largeur, hauteur, k: vb[2] / largeur };
}

/** La carte, en SVG : celle de l'élève — à compléter —, ou celle du corrigé — coloriée, tracée. */
export function svgDeLaCarte(c: CarteHGCM, corrige: boolean, largeurMax: number, hauteurMax: number): string {
  const fond = FONDS_DE_CARTE[c.fond];
  const { vb, largeur, hauteur, k } = tailleDeLaCarte(c, largeurMax, hauteurMax);
  const mm = (v: number) => num(v * k);
  const prefixe = `hgc-${c.fond}-${corrige ? "c" : "e"}`;
  const couleurs = new Map<string, string>();
  for (const g of c.colorier ?? []) for (const id of formesDuGroupe(fond, g.formes)) couleurs.set(id, g.couleur);
  const parties: string[] = [mer(fond, k)];

  if (fond.voisins) parties.push(`<g fill="#e4e5e8" stroke="#a3a7b2" stroke-width="${mm(0.15)}">${fond.voisins.map((v) => `<path d="${v.d}"/>`).join("")}</g>`);
  parties.push(`<g fill="${TERRE}" stroke="${BORD}" stroke-width="${mm(c.fond === "france" ? 0.25 : 0.15)}" stroke-linejoin="round" fill-rule="evenodd">`
    + fond.formes.map((f) => `<path${c.continent && f.europe ? ` id="${prefixe}-${f.id}"` : ""}${corrige && couleurs.has(f.id) ? ` fill="${couleurs.get(f.id)}"` : ""} d="${f.d}"/>`).join("")
    + "</g>");
  // Le continent européen : sa teinte multipliée garde les frontières par-dessus.
  if (c.continent && fond.continent) {
    parties.push(`<g fill="#f3e1a6" style="mix-blend-mode:multiply"><path d="${fond.continent}"/>`
      + fond.formes.filter((f) => f.europe).map((f) => `<use href="#${prefixe}-${f.id}"/>`).join("") + "</g>");
  }
  // Les aplats, au corrigé : coupés à la terre — sans les encarts —, leur teinte multipliée garde les frontières par-dessus.
  if (corrige && c.aplats?.length) {
    const encarts = new Set((fond.cadres ?? []).map((x) => x.id));
    parties.push(`<clipPath id="${prefixe}-terre">${fond.formes.filter((f) => !encarts.has(f.id)).map((f) => `<path d="${f.d}"/>`).join("")}</clipPath>`
      + `<g clip-path="url(#${prefixe}-terre)" style="mix-blend-mode:multiply">`
      + c.aplats.map((a) => `<path fill="${a.couleur}" d="${chemin(a.contour.map((p) => projeter(fond, p)))}z"/>`).join("")
      + "</g>");
  }
  if (c.massifs && fond.zones) {
    parties.push(corrige
      ? `<g fill="${MASSIF.couleur}" fill-opacity="0.5" stroke="${MASSIF.bord}" stroke-width="${mm(0.2)}">${fond.zones.map((z) => `<path d="${z.d}"/>`).join("")}</g>`
      : `<g fill="none" stroke="${MASSIF.bord}" stroke-width="${mm(0.25)}" stroke-dasharray="${mm(0.9)} ${mm(0.6)}">${fond.zones.map((z) => `<path d="${z.d}"/>`).join("")}</g>`);
  }
  if (c.fleuves && fond.lignes) {
    parties.push(`<g fill="none" stroke="${corrige ? FLEUVE.couleur : FLEUVE.eleve}" stroke-width="${mm(corrige ? 0.6 : 0.4)}" stroke-linejoin="round" stroke-linecap="round">`
      + fond.lignes.map((l) => `<path d="${l.d}"/>`).join("") + "</g>");
  }
  // Les encarts de l'outre-mer : leur cadre ; leur nom, sauf quand on numérote les régions.
  const regionsNumerotees = (c.numeros ?? []).some((n) => fond.formes.some((f) => f.id === n.quoi));
  for (const cadre of fond.cadres ?? []) {
    parties.push(`<rect x="${cadre.x}" y="${cadre.y}" width="${cadre.l}" height="${cadre.h}" fill="none" stroke="${BORD}" stroke-width="${mm(0.25)}"/>`);
    if (!regionsNumerotees) {
      parties.push(`<text x="${num(cadre.x + cadre.l / 2)}" y="${num(cadre.y + cadre.h + 17)}" font-size="${mm(2.6)}" font-weight="700" fill="${GRIS}" text-anchor="middle"`
        + ` dominant-baseline="central">${escapeHtml(cadre.nom)}</text>`);
    }
  }

  // Les traits ; les flèches portent une lettre, au milieu.
  const lettres: { x: number; y: number; texte: string }[] = [];
  for (const groupe of c.traits ?? []) {
    if (groupe.aTracer && !corrige) continue;
    const s = STYLE_TRAIT[groupe.sorte];
    const couleur = corrige ? s.couleur : s.eleve ?? s.couleur;
    for (const t of groupe.liste) {
      const morceaux = morceauxDuTrait(fond, t.par);
      for (const [i, morceau] of morceaux.entries()) {
        let pts = decaler(morceau, (t.decalage ?? 0) * k);
        if (groupe.sorte === "fleche") pts = raccourcir(pts, 1.8 * k);
        parties.push(`<path d="${chemin(pts)}" fill="none" stroke="${couleur}" stroke-width="${mm(s.epaisseur)}" stroke-linecap="round" stroke-linejoin="round"`
          + `${s.tirets ? ` stroke-dasharray="${mm(s.tirets[0])} ${mm(s.tirets[1])}"` : ""}/>`);
        if (groupe.sorte === "fleche" && i === morceaux.length - 1) {
          const [bx, by] = pts[pts.length - 1], [ax, ay] = pts[pts.length - 2];
          const l = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / l, uy = (by - ay) / l, long = 2.6 * k, large = 1.3 * k;
          parties.push(`<path d="M${num(bx)} ${num(by)}L${num(bx - ux * long - uy * large)} ${num(by - uy * long + ux * large)}L${num(bx - ux * long + uy * large)} ${num(by - uy * long - ux * large)}z" fill="${couleur}"/>`);
        }
      }
      // Le plus long morceau porte la lettre et le nom.
      const tout = morceaux.reduce((a, b) => (b.length > a.length ? b : a), [] as [number, number][]);
      if (t.texte) { const [x, y] = milieu(tout); lettres.push({ x, y, texte: lettre(lettres.length) }); }
      if (t.nom && corrige) {
        const [x, y] = milieu(decaler(tout, (t.decalage ?? 0) * k));
        parties.push(`<text x="${num(x)}" y="${num(y)}" font-size="${mm(2.5)}" font-weight="800" fill="${couleur}" text-anchor="middle" dominant-baseline="central"`
          + ` stroke="#fff" stroke-width="${mm(0.6)}" paint-order="stroke">${escapeHtml(t.nom)}</text>`);
      }
    }
  }

  // Les noms écrits sur la carte, les repères nommés, les points.
  for (const t of c.textes ?? []) {
    const [x, y] = projeter(fond, t.ou);
    parties.push(`<text x="${num(x)}" y="${num(y)}" font-size="${mm(3.2)}" font-weight="800" letter-spacing="${mm(0.5)}" fill="${GRIS}" text-anchor="middle" dominant-baseline="central">${escapeHtml(t.texte)}</text>`);
  }
  const obstacles: [number, number][] = [];
  const pointEn = (id: string) => { const l = LIEUX_DES_CARTES[id]; return projeter(fond, [l.lon, l.lat], l.encart); };
  for (const id of c.reperes ?? []) {
    const [x, y] = pointEn(id);
    obstacles.push([x, y]);
    parties.push(`<circle cx="${num(x)}" cy="${num(y)}" r="${mm(0.8)}" fill="${ENCRE}"/><text x="${num(x + 1.5 * k)}" y="${num(y)}" font-size="${mm(2.8)}" font-weight="700" fill="${ENCRE}"`
      + ` dominant-baseline="central" stroke="#fff" stroke-width="${mm(0.6)}" paint-order="stroke">${escapeHtml(LIEUX_DES_CARTES[id].nom)}</text>`);
  }
  for (const id of c.points?.lieux ?? []) {
    const [x, y] = pointEn(id);
    obstacles.push([x, y]);
    parties.push(`<circle cx="${num(x)}" cy="${num(y)}" r="${mm(POINT)}" fill="${ENCRE}"/>`);
  }

  // Les numéros : à leur place — à côté du point, pour un lieu —, puis écartés.
  const r = RAYON * k;
  const pastilles: Pastille[] = [];
  for (const [i, n] of (c.numeros ?? []).entries()) {
    const place = placeDuNumero(fond, n);
    if (!place) continue;
    if (place.point) {
      obstacles.push([place.x, place.y]);
      parties.push(`<circle cx="${num(place.x)}" cy="${num(place.y)}" r="${mm(POINT)}" fill="${ENCRE}"/>`);
    }
    const decale = place.point ? 2.6 * k : 0;
    pastilles.push({ x: place.x + decale, y: place.y - decale, ax: place.x, ay: place.y, texte: String(i + 1), point: place.point });
  }
  for (const l of lettres) pastilles.push({ x: l.x, y: l.y, ax: l.x, ay: l.y, texte: l.texte, point: false });
  ecarter(pastilles, obstacles, r, k, vb);
  for (const p of pastilles) {
    const loin = Math.hypot(p.x - p.ax, p.y - p.ay);
    if (loin > r * (p.point ? 1.2 : 0.9)) {
      const f = (loin - r) / loin;
      parties.push(`<path d="M${num(p.ax)} ${num(p.ay)}L${num(p.ax + (p.x - p.ax) * f)} ${num(p.ay + (p.y - p.ay) * f)}" stroke="${ENCRE}" stroke-width="${mm(0.2)}"/>`);
      if (!p.point) parties.push(`<circle cx="${num(p.ax)}" cy="${num(p.ay)}" r="${mm(0.45)}" fill="${ENCRE}"/>`);
    }
    const carre = /[A-Z]/.test(p.texte);
    parties.push(carre
      ? `<rect x="${num(p.x - r)}" y="${num(p.y - r)}" width="${num(2 * r)}" height="${num(2 * r)}" rx="${mm(0.6)}" fill="#fff" stroke="${ENCRE}" stroke-width="${mm(0.3)}"/>`
      : `<circle cx="${num(p.x)}" cy="${num(p.y)}" r="${num(r)}" fill="#fff" stroke="${ENCRE}" stroke-width="${mm(0.3)}"/>`);
    parties.push(`<text x="${num(p.x)}" y="${num(p.y)}" font-size="${mm(p.texte.length > 1 ? 2.5 : 3)}" font-weight="800" fill="${ENCRE}" text-anchor="middle" dominant-baseline="central">${p.texte}</text>`);
  }

  const globe = fond.projection.sorte === "equal-earth" && !c.cadrage;
  return `<svg class="hgc-svg${globe ? " hgc-globe" : ""}" xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(num).join(" ")}" style="width:${num(largeur)}mm;height:${num(hauteur)}mm">`
    + `<defs><clipPath id="${prefixe}-cadre"><rect x="${num(vb[0])}" y="${num(vb[1])}" width="${num(vb[2])}" height="${num(vb[3])}"/></clipPath></defs>`
    + `<g clip-path="url(#${prefixe}-cadre)">${parties.join("")}</g></svg>`;
}

// ── La légende et les noms ────────────────────────────────────────────────

/** Un échantillon de trait pour la légende. */
function echantillon(sorte: TraitsDeCarte["sorte"] | "fleuve", corrige: boolean): string {
  const s = sorte === "fleuve" ? { couleur: FLEUVE.couleur, epaisseur: 0.6, tirets: undefined } : STYLE_TRAIT[sorte];
  const couleur = !corrige && sorte !== "fleuve" && STYLE_TRAIT[sorte].eleve ? STYLE_TRAIT[sorte].eleve : s.couleur;
  return `<svg class="hgc-ech" viewBox="0 0 10 4" style="width:10mm;height:4mm"><path d="M0.5 2L${sorte === "fleche" ? 7.5 : 9.5} 2" stroke="${couleur}" stroke-width="${s.epaisseur}"`
    + `${s.tirets ? ` stroke-dasharray="${s.tirets[0]} ${s.tirets[1]}"` : ""} fill="none"/>${sorte === "fleche" ? `<path d="M9.5 2L7 0.8L7 3.2z" fill="${couleur}"/>` : ""}</svg>`;
}

function legende(c: CarteHGCM, corrige: boolean): string {
  const lignes: string[] = [];
  const ligne = (signe: string, texte: string) => lignes.push(`<div class="hgc-l">${signe}<span>${escapeHtml(texte)}</span></div>`);
  const point = '<span class="hgc-signe"><i class="hgc-point"></i></span>';
  if (c.continent) ligne('<span class="hgc-case" style="background:#f3e1a6"></span>', "le continent européen, jusqu'à l'Oural et au Caucase");
  for (const g of [...(c.colorier ?? []), ...(c.aplats ?? [])]) ligne(`<span class="hgc-case"${corrige ? ` style="background:${g.couleur}"` : ""}></span>`, g.nom);
  if (c.legendeNumeros) ligne(point, c.legendeNumeros);
  if (c.points) ligne(point, c.points.legende);
  if (c.fleuves) ligne(`<span class="hgc-signe">${echantillon("fleuve", corrige)}</span>`, "un fleuve");
  if (c.massifs) ligne(`<span class="hgc-case" style="background:${MASSIF.couleur}80;border-color:${MASSIF.bord}"></span>`, "un massif montagneux");
  for (const t of c.traits ?? []) ligne(`<span class="hgc-signe">${echantillon(t.sorte, corrige)}</span>`, t.legende);
  return lignes.length ? `<div class="hgc-legende"><b>Légende</b>${lignes.join("")}</div>` : "";
}

/** Ce qui accompagne la carte : la légende ; les noms à écrire et leur banque ; ce qu'on écrit sur les flèches et sa banque ; au corrigé, les réponses. */
function autourDeLaCarte(c: CarteHGCM, corrige: boolean, graine: number, colonnes: number) {
  const r = hasard(graine);
  const noms = (c.numeros ?? []).map((n) => n.nom);
  const textes = (c.traits ?? []).flatMap((t) => t.liste.filter((x) => x.texte).map((x) => x.texte as string));
  // Une grille, rangée colonne par colonne : WebKit, qui imprime dans l'application, ignore les colonnes CSS d'une liste.
  const liste = (elements: string[], marque: (i: number) => string, cols: number) => (elements.length
    ? `<ol class="hgc-noms${corrige ? " hgc-reponses" : ""}" style="grid-template-columns:repeat(${cols},minmax(0,1fr));grid-template-rows:repeat(${Math.ceil(elements.length / cols)},auto)">${elements.map((e, i) => `<li><b>${marque(i)}.</b> `
      + (corrige ? escapeHtml(e) : '<span class="hgc-ligne"></span>') + "</li>").join("")}</ol>` : "");
  const banque = (elements: string[]) => (c.banque && !corrige && elements.length
    ? `<div class="hg-banque hgc-banque">${melanger(r, elements).map((e) => `<span>${escapeHtml(e)}</span>`).join("")}</div>` : "");
  return {
    legende: legende(c, corrige),
    banqueNoms: banque(noms), noms: liste(noms, (i) => String(i + 1), noms.length > 4 ? colonnes : 1),
    banqueTextes: banque(textes), textes: liste(textes, lettre, 1),
    beaucoup: noms.length > 8,
  };
}

const NATURAL_EARTH = "Fond de carte : Natural Earth (domaine public).";
/** La largeur de la page, en mm : A4 couchée ou debout, moins ses marges. */
const PAGE = { paysage: 277, portrait: 182 };

/**
 * La carte et ce qui l'accompagne. Quand la carte laisse assez de place à
 * côté d'elle — le planisphère en paysage, la France debout —, la légende et
 * les noms à écrire s'y mettent, et la banque des noms passe dessous ; sinon,
 * tout va sous la carte. Pour l'élève, ou pour le corrigé.
 */
export function htmlDeLaCarte(c: CarteHGCM, corrige: boolean, graine: number, paysage = carteEnPaysage(c)): string {
  const [largeurMax, hauteurMax] = paysage ? [190, Math.min(100, c.hauteur ?? 100)] : [182, Math.min(140, c.hauteur ?? 140)];
  const taille = tailleDeLaCarte(c, largeurMax, hauteurMax);
  const page = paysage ? PAGE.paysage : PAGE.portrait;
  const panneau = page - taille.largeur - 5;
  const carte = `<div class="hgc-carte">${svgDeLaCarte(c, corrige, largeurMax, hauteurMax)}</div>`
    + `<div class="hgc-note">${c.note ? `${escapeHtml(c.note)} ` : ""}${NATURAL_EARTH}</div>`;
  if (panneau >= 48) {
    const a = autourDeLaCarte(c, corrige, graine, panneau >= 75 ? 2 : 1);
    return `<div class="hgc-cote"><div class="hgc-gauche" style="width:${num(taille.largeur + 0.6)}mm">${carte}</div><div class="hgc-panneau">${a.legende}${a.noms}${a.textes}</div></div>`
      + (a.banqueNoms || a.banqueTextes ? `<div class="hgc-banques">${a.banqueNoms}${a.banqueTextes}</div>` : "");
  }
  const a = autourDeLaCarte(c, corrige, graine, a0Colonnes(c));
  const noms = a.noms ? `<div class="hgc-bloc${a.beaucoup ? " hgc-large" : ""}">${a.banqueNoms}${a.noms}</div>` : "";
  const textes = a.textes ? `<div class="hgc-bloc hgc-large">${a.banqueTextes}${a.textes}</div>` : "";
  // Beaucoup de noms : leur bloc prend toute la largeur, la légende passe dessous.
  return carte + `<div class="hgc-bas">${a.beaucoup ? noms + a.legende : a.legende + noms}${textes}</div>`;
}

/** Les colonnes des noms sous la carte : trois au-delà de douze noms, deux au-delà de quatre. */
const a0Colonnes = (c: CarteHGCM) => ((c.numeros ?? []).length > 12 ? 3 : 2);

export const STYLE_CARTES_HG = `
  .feuille.hg .hgc-carte { text-align: center; margin: 2mm 0 0; line-height: 0; }
  .feuille.hg .hgc-svg { display: inline-block; border: 1px solid #4a5060; }
  .feuille.hg .hgc-svg.hgc-globe { border: none; }
  .feuille.hg .hgc-note { font-size: 9.5px; color: #687087; font-style: italic; margin: 1mm 0 2mm; text-align: center; }
  .feuille.hg .hgc-bas { display: flex; flex-wrap: wrap; gap: 3mm 5mm; align-items: flex-start; }
  .feuille.hg .hgc-cote { display: flex; gap: 5mm; align-items: flex-start; }
  .feuille.hg .hgc-gauche { flex: none; }
  .feuille.hg .hgc-panneau { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3mm; margin-top: 2mm; }
  .feuille.hg .hgc-banques { margin: 1mm 0 0; }
  .feuille.hg .hgc-legende { border: 1.5px solid #1c2233; border-radius: 1.5mm; padding: 2mm 3mm; font-size: 12px; flex: 0 1 auto; max-width: 100%;
    break-inside: avoid; page-break-inside: avoid; }
  .feuille.hg .hgc-legende > b { display: block; margin: 0 0 1mm; font-size: 12.5px; }
  .feuille.hg .hgc-l { display: flex; align-items: center; gap: 2mm; margin: 0 0 1mm; line-height: 1.3; }
  .feuille.hg .hgc-case { flex: none; width: 7mm; height: 4.5mm; border: 1.2px solid #1c2233; box-sizing: border-box; }
  .feuille.hg .hgc-signe { flex: none; width: 10mm; display: inline-flex; align-items: center; justify-content: center; }
  .feuille.hg .hgc-point { display: inline-block; width: 2mm; height: 2mm; border-radius: 50%; background: #1c2233; }
  .feuille.hg .hgc-bloc { flex: 1 1 60mm; min-width: 0; }
  .feuille.hg .hgc-bloc.hgc-large { flex: 1 1 100%; }
  .feuille.hg .hgc-banque { margin: 0 0 2mm; }
  .feuille.hg .hgc-banque span { font-size: 12px; padding: 1mm 2mm; }
  .feuille.hg .hgc-noms { list-style: none; margin: 0; padding: 0; font-size: 12.5px; display: grid; grid-auto-flow: column; column-gap: 5mm; }
  .feuille.hg .hgc-noms li { display: flex; align-items: flex-end; gap: 1.5mm; break-inside: avoid; page-break-inside: avoid; min-height: 7mm; line-height: 1.35; }
  .feuille.hg .hgc-noms li b { flex: none; }
  .feuille.hg .hgc-noms.hgc-reponses li { align-items: baseline; min-height: 0; margin: 0 0 1.5mm; }
  .feuille.hg .hgc-ligne { flex: 1; border-bottom: 1px dotted #687087; height: 5mm; }
`;
