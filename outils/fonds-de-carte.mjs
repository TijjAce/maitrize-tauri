// Fabrique src/fondsDeCarte.ts : les fonds de carte de l'histoire-géographie
// du cours moyen — le planisphère, l'Europe, la France et ses régions —, à
// partir des données de Natural Earth (domaine public, naturalearthdata.com).
//
//   node outils/fonds-de-carte.mjs <dossier des fichiers Natural Earth> src/fondsDeCarte.ts
//
// Fichiers attendus dans le dossier (GeoJSON du dépôt nvkelso/natural-earth-vector) :
// ne_50m_admin_0_countries, ne_10m_admin_1_states_provinces,
// ne_10m_rivers_lake_centerlines, ne_10m_geography_regions_polys.
//
// Le planisphère est en projection Equal Earth, celle du planisphère de la
// classe d'Éduscol ; l'Europe et la France, en projection azimutale
// équivalente de Lambert. Les départements de Natural Earth sont regroupés
// en régions : leurs bords communs s'annulent. Les tracés sont simplifiés
// (Douglas-Peucker), arrondis au dixième, écrits en coordonnées relatives.
// Chaque fond garde sa projection : les lieux, les tracés et les numéros des
// exercices se placent au moment de dessiner (voir src/cartesHistoireGeo.ts).

import { readFileSync, writeFileSync } from "node:fs";

const [dossier, sortie] = process.argv.slice(2);
if (!dossier || !sortie) { console.error("usage : node outils/fonds-de-carte.mjs <dossier Natural Earth> <sortie.ts>"); process.exit(1); }
const lire = (f) => JSON.parse(readFileSync(`${dossier}/${f}.geojson`, "utf8"));

// ── Projections ───────────────────────────────────────────────────────────

const RAD = Math.PI / 180;
/** Equal Earth (Šavrič, Patterson, Jenny, 2018). */
function equalEarth([lon, lat]) {
  const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
  const l = lon * RAD, t = Math.asin(M * Math.sin(lat * RAD)), t2 = t * t, t6 = t2 * t2 * t2;
  const x = (2 * Math.sqrt(3) * l * Math.cos(t)) / (3 * (9 * A4 * t6 * t2 + 7 * A3 * t6 + 3 * A2 * t2 + A1));
  const y = A4 * t6 * t2 * t + A3 * t6 * t + A2 * t2 * t + A1 * t;
  return [x, -y];
}
/** Azimutale équivalente de Lambert, centrée sur (lon0, lat0). */
const lambert = (lon0, lat0) => ([lon, lat]) => {
  const l = (lon - lon0) * RAD, p = lat * RAD, p0 = lat0 * RAD;
  const k = Math.sqrt(2 / (1 + Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l)));
  return [k * Math.cos(p) * Math.sin(l), -k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l))];
};

// ── Géométrie ─────────────────────────────────────────────────────────────

const anneaux = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
const lignesDe = (g) => (g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : []);
const aire = (r) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return s / 2; };
function centre(r) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
    a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f;
  }
  return a ? [cx / (3 * a), cy / (3 * a)] : r[0];
}
/** La distance d'un point à un segment. */
function distanceAuSegment(x, y, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, n = dx * dx + dy * dy;
  const t = n ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / n)) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}
/** Le point d'un polygone (son contour, ses trous) le plus loin de ses bords : un numéro y tient, même dans un pays tout en longueur. */
function interieur(anneauxDuPoly) {
  const ext = anneauxDuPoly[0];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of ext) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const dedans = (x, y) => {
    let c = false;
    for (const r of anneauxDuPoly) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const distance = (x, y) => {
    let m = Infinity;
    for (const r of anneauxDuPoly) for (let i = 0, j = r.length - 1; i < r.length; j = i++) m = Math.min(m, distanceAuSegment(x, y, r[j], r[i]));
    return m;
  };
  let meilleur = centre(ext), loin = dedans(...meilleur) ? distance(...meilleur) : -1;
  let demi = Math.max(x1 - x0, y1 - y0) / 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, pas = demi / 12;
  for (let tour = 0; tour < 4 && pas > 0; tour++) {
    for (let x = cx - demi; x <= cx + demi; x += pas) for (let y = cy - demi; y <= cy + demi; y += pas) {
      if (!dedans(x, y)) continue;
      const d = distance(x, y);
      if (d > loin) { loin = d; meilleur = [x, y]; }
    }
    [cx, cy] = meilleur; demi = pas * 1.5; pas /= 6;
  }
  return meilleur;
}
/** Douglas-Peucker, itératif ; `ferme` : un anneau garde au moins quatre points. */
function simplifier(points, tolerance, ferme) {
  if (points.length <= (ferme ? 4 : 2)) return points;
  const garder = new Uint8Array(points.length); garder[0] = garder[points.length - 1] = 1;
  const pile = [[0, points.length - 1]];
  while (pile.length) {
    const [a, b] = pile.pop();
    let max = 0, idx = -1;
    const [ax, ay] = points[a], [bx, by] = points[b], dx = bx - ax, dy = by - ay, n = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = n === 1 && !dx && !dy ? Math.hypot(points[i][0] - ax, points[i][1] - ay) : Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / n;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tolerance && idx > 0) { garder[idx] = 1; pile.push([a, idx], [idx, b]); }
  }
  const s = points.filter((_, i) => garder[i]);
  return ferme && s.length < 4 ? points.filter((_, i) => i % Math.ceil(points.length / 4) === 0).concat([points[0]]) : s;
}
/** Sutherland-Hodgman : un anneau coupé au rectangle du cadre. */
function couper(r, [x0, y0, x1, y1]) {
  const bords = [
    (p) => p[0] >= x0, (p) => p[0] <= x1, (p) => p[1] >= y0, (p) => p[1] <= y1,
  ];
  const inter = (a, b, k) => {
    const [ax, ay] = a, [bx, by] = b;
    if (k < 2) { const x = k === 0 ? x0 : x1; const t = (x - ax) / (bx - ax); return [x, ay + t * (by - ay)]; }
    const y = k === 2 ? y0 : y1; const t = (y - ay) / (by - ay); return [ax + t * (bx - ax), y];
  };
  let sortie = r;
  bords.forEach((dedans, k) => {
    const entree = sortie; sortie = [];
    for (let i = 0; i < entree.length; i++) {
      const a = entree[(i + entree.length - 1) % entree.length], b = entree[i];
      if (dedans(b)) { if (!dedans(a)) sortie.push(inter(a, b, k)); sortie.push(b); }
      else if (dedans(a)) sortie.push(inter(a, b, k));
    }
  });
  return sortie;
}
/** Une ligne coupée au cadre : ses morceaux dedans. */
function couperLigne(l, [x0, y0, x1, y1]) {
  const dedans = ([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const morceaux = []; let courant = [];
  for (const p of l) { if (dedans(p)) courant.push(p); else { if (courant.length > 1) morceaux.push(courant); courant = []; } }
  if (courant.length > 1) morceaux.push(courant);
  return morceaux;
}
const arrondi = (v) => Math.round(v * 10) / 10;
/** Un tracé SVG compact : le premier point en absolu, les suivants en relatif. */
function trace(points, ferme) {
  let d = "", px = 0, py = 0;
  points.forEach(([x, y], i) => {
    const rx = arrondi(x), ry = arrondi(y);
    if (i === 0) d += `M${rx} ${ry}`;
    else { const dx = arrondi(rx - px), dy = arrondi(ry - py); if (!dx && !dy) return; d += `${i === 1 ? "l" : " "}${dx} ${dy}`; }
    px = rx; py = ry;
  });
  return d + (ferme ? "z" : "");
}

/** Projette, cadre, simplifie : un fond tient dans `largeur` unités. `sorte` décrit la projection, pour la refaire en dessinant. */
function preparer({ projection, sorte, cadre, largeur }) {
  // `cadre` : [lon0, lat0, lon1, lat1] — on en projette le contour pour fixer l'échelle.
  const coins = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    coins.push(projection([cadre[0] + t * (cadre[2] - cadre[0]), cadre[1]]), projection([cadre[0] + t * (cadre[2] - cadre[0]), cadre[3]]),
      projection([cadre[0], cadre[1] + t * (cadre[3] - cadre[1])]), projection([cadre[2], cadre[1] + t * (cadre[3] - cadre[1])]));
  }
  const xs = coins.map((p) => p[0]), ys = coins.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const echelle = largeur / (x1 - x0);
  const hauteur = (y1 - y0) * echelle;
  const p = (c) => { const [x, y] = projection(c); return [(x - x0) * echelle, (y - y0) * echelle]; };
  return { p, largeur, hauteur: arrondi(hauteur), boite: [0, 0, largeur, hauteur], projection: { ...sorte, k: echelle, dx: -x0 * echelle, dy: -y0 * echelle } };
}

function formes(f, prep, { tolerance, aireMin, couperAuCadre }) {
  const sortie = [];
  for (const [n, poly] of f.entries()) {
    poly.forEach((anneau, k) => {
      let r = anneau.map(prep.p);
      if (couperAuCadre) r = couper(r, prep.boite);
      if (r.length < 3) return;
      const a = Math.abs(aire(r));
      if (k === 0 && a < aireMin) return;
      if (k > 0 && a < aireMin * 4) return;
      const s = simplifier([...r, r[0]], tolerance, true);
      if (s.length >= 4) sortie.push({ points: s, aire: a, poly: n, trou: k > 0 });
    });
  }
  return sortie;
}
/** Où écrire le numéro d'une forme : au cœur de son plus grand polygone, ses trous comptés. */
function etiquette(r) {
  const grand = r.filter((x) => !x.trou).reduce((a, b) => (b.aire > a.aire ? b : a));
  return interieur([grand.points, ...r.filter((x) => x.trou && x.poly === grand.poly).map((x) => x.points)]).map(arrondi);
}

// ── Les données ───────────────────────────────────────────────────────────

const pays = lire("ne_50m_admin_0_countries");
const admin1 = lire("ne_10m_admin_1_states_provinces");
const fleuves = lire("ne_10m_rivers_lake_centerlines");
const geo = lire("ne_10m_geography_regions_polys");

/** La France de Natural Earth, coupée en ses parties : l'Hexagone et la Corse ; les cinq régions d'outre-mer. */
function partiesDeLaFrance(f) {
  const parties = { FRA: [], GUF: [], GLP: [], MTQ: [], REU: [], MYT: [] };
  for (const poly of anneaux(f.geometry)) {
    const [cx, cy] = centre(poly[0]);
    const cle = cx < -50 && cx > -56 ? "GUF" : cx < -60 && cy > 15.5 ? "GLP" : cx < -60 ? "MTQ" : cx > 50 ? "REU" : cx > 40 ? "MYT" : "FRA";
    parties[cle].push(poly);
  }
  return parties;
}
const NOMS_OUTRE_MER = { GUF: "Guyane", GLP: "Guadeloupe", MTQ: "Martinique", REU: "La Réunion", MYT: "Mayotte" };

/** Les pays, avec la France coupée en ses parties ; leur nom en français. */
function paysDuMonde() {
  const liste = [];
  for (const f of pays.features) {
    const pr = f.properties;
    if (pr.ADM0_A3 === "FRA") {
      for (const [cle, polys] of Object.entries(partiesDeLaFrance(f))) liste.push({ id: cle, nom: NOMS_OUTRE_MER[cle] ?? "France", polys, europe: cle === "FRA" });
    } else liste.push({ id: pr.ADM0_A3, nom: pr.NAME_FR || pr.NAME, polys: anneaux(f.geometry), europe: pr.CONTINENT === "Europe" && pr.ADM0_A3 !== "RUS" });
  }
  return liste;
}

// ── Le planisphère ────────────────────────────────────────────────────────

function fondMonde() {
  const prep = preparer({ projection: equalEarth, sorte: { sorte: "equal-earth" }, cadre: [-180, -90, 180, 90], largeur: 1000 });
  const sortie = [];
  for (const pay of paysDuMonde()) {
    const r = formes(pay.polys, prep, { tolerance: 0.9, aireMin: 0.8, couperAuCadre: false });
    if (!r.length) continue;
    sortie.push({ id: pay.id, nom: pay.nom, d: r.map((x) => trace(x.points, true)).join(""), centre: etiquette(r), ...(pay.europe ? { europe: true } : {}) });
  }
  return { largeur: prep.largeur, hauteur: prep.hauteur, projection: prep.projection, formes: sortie };
}

// ── L'Europe ──────────────────────────────────────────────────────────────

function fondEurope() {
  const prep = preparer({ projection: lambert(15, 52), sorte: { sorte: "lambert", lon0: 15, lat0: 52 }, cadre: [-25, 34, 62, 71], largeur: 1000 });
  const sortie = [];
  for (const pay of paysDuMonde()) {
    if (["GUF", "GLP", "MTQ", "REU", "MYT"].includes(pay.id)) continue;
    const proches = pay.polys.filter((poly) => {
      const lons = poly[0].map((p) => p[0]), lats = poly[0].map((p) => p[1]);
      return Math.max(...lons) > -40 && Math.min(...lons) < 90 && Math.max(...lats) > 20 && Math.min(...lats) < 85;
    });
    const r = formes(proches, prep, { tolerance: 0.7, aireMin: 0.6, couperAuCadre: true });
    if (!r.length) continue;
    sortie.push({ id: pay.id, nom: pay.nom, d: r.map((x) => trace(x.points, true)).join(""), centre: etiquette(r), ...(pay.europe ? { europe: true } : {}) });
  }
  // Le continent dans ses limites conventionnelles — jusqu'à l'Oural et au Caucase —, d'après la région « Europe » de Natural Earth.
  const europe = geo.features.find((f) => f.properties.FEATURECLA === "Continent" && f.properties.NAME === "EUROPE");
  const continent = formes(anneaux(europe.geometry), prep, { tolerance: 0.6, aireMin: 4, couperAuCadre: true }).map((x) => trace(x.points, true)).join("");
  return { largeur: prep.largeur, hauteur: prep.hauteur, projection: prep.projection, formes: sortie, continent };
}

// ── La France : les régions, l'outre-mer en encarts, les fleuves, les massifs ──

const cle = ([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`;
/** Les départements d'une région, fondus : les bords communs s'annulent, le reste se raccorde en anneaux. */
function fondre(polys) {
  const aretes = new Map();
  for (const poly of polys) for (const anneau of poly) {
    for (let i = 0; i + 1 < anneau.length; i++) {
      const a = cle(anneau[i]), b = cle(anneau[i + 1]);
      if (a === b) continue;
      const inverse = `${b}>${a}`;
      if (aretes.has(inverse)) aretes.delete(inverse);
      else aretes.set(`${a}>${b}`, [anneau[i], anneau[i + 1]]);
    }
  }
  const suivantes = new Map();
  for (const [k, [p, q]] of aretes) { const a = k.split(">")[0]; (suivantes.get(a) ?? suivantes.set(a, []).get(a)).push(q); }
  const rings = [];
  const vues = new Set();
  for (const [k, [p]] of aretes) {
    if (vues.has(k)) continue;
    const anneau = [p]; let courant = p, garde = 0;
    while (garde++ < 1e6) {
      const a = cle(courant);
      const liste = suivantes.get(a); if (!liste || !liste.length) break;
      const q = liste.pop(); vues.add(`${a}>${cle(q)}`);
      anneau.push(q); courant = q;
      if (cle(q) === cle(p)) break;
    }
    if (anneau.length > 3) rings.push(anneau);
  }
  // Les anneaux extérieurs d'abord ; les trous, s'il y en a, rangés avec eux par le remplissage pair-impair du SVG.
  return rings.map((r) => [r]);
}

/** Où mettre le numéro d'un fleuve — le point de son cours le plus proche — ou d'un massif : en France, loin des villes. */
const ANCRES = {
  seine: [1.45, 49.2], loire: [0.7, 47.38], garonne: [0.6, 44.22], rhone: [4.74, 44.45], rhin: [7.57, 47.98], maroni: [-54.15, 4.55],
  alpes: [6.45, 45.15], pyrenees: [0.55, 42.82], "massif-central": [2.85, 45.2], jura: [5.95, 46.68], vosges: [7.0, 48.12],
};
/** Le point d'un cours le plus proche de `cible`. */
const surLeCours = (points, cible) => points.reduce((a, b) => (Math.hypot(b[0] - cible[0], b[1] - cible[1]) < Math.hypot(a[0] - cible[0], a[1] - cible[1]) ? b : a)).map(arrondi);

const REGIONS_NE = {
  "Auvergne-Rhône-Alpes": ["ARA", "Auvergne-Rhône-Alpes"], "Bourgogne-Franche-Comté": ["BFC", "Bourgogne-Franche-Comté"], "Bretagne": ["BRE", "Bretagne"],
  "Centre-Val de Loire": ["CVL", "Centre-Val de Loire"], "Corse": ["COR", "Corse"], "Grand Est": ["GES", "Grand Est"], "Hauts-de-France": ["HDF", "Hauts-de-France"],
  "Île-de-France": ["IDF", "Île-de-France"], "Normandie": ["NOR", "Normandie"], "Nouvelle-Aquitaine": ["NAQ", "Nouvelle-Aquitaine"], "Occitanie": ["OCC", "Occitanie"],
  "Pays de la Loire": ["PDL", "Pays de la Loire"], "Provence-Alpes-Côte-d'Azur": ["PAC", "Provence-Alpes-Côte d'Azur"],
  "Guadeloupe": ["GLP", "Guadeloupe"], "Martinique": ["MTQ", "Martinique"], "Guyane française": ["GUF", "Guyane"], "Réunion": ["REU", "La Réunion"], "Mayotte": ["MYT", "Mayotte"],
};

function fondFrance() {
  const largeur = 1000;
  const prep = preparer({ projection: lambert(2.5, 46.5), sorte: { sorte: "lambert", lon0: 2.5, lat0: 46.5 }, cadre: [-5.3, 41.2, 9.9, 51.3], largeur });
  const departements = admin1.features.filter((f) => f.properties.admin === "France");
  const parRegion = new Map();
  for (const f of departements) {
    const [id, nom] = REGIONS_NE[f.properties.region] ?? [];
    if (!id) throw new Error(`région inconnue : ${f.properties.region}`);
    if (!parRegion.has(id)) parRegion.set(id, { id, nom, polys: [] });
    parRegion.get(id).polys.push(...anneaux(f.geometry));
  }
  const regions = [];
  for (const { id, nom, polys } of parRegion.values()) {
    if (["GLP", "MTQ", "GUF", "REU", "MYT"].includes(id)) continue;
    const r = formes(fondre(polys), prep, { tolerance: 0.45, aireMin: 1.5, couperAuCadre: false });
    regions.push({ id, nom, d: r.map((x) => trace(x.points, true)).join(""), centre: etiquette(r) });
  }
  // Les pays voisins, en gris : coupés au cadre.
  const voisins = [];
  for (const pay of paysDuMonde()) {
    if (!["ESP", "AND", "ITA", "CHE", "DEU", "BEL", "LUX", "GBR", "NLD", "MCO", "SMR", "AUT", "LIE", "IRL"].includes(pay.id)) continue;
    const r = formes(pay.polys, prep, { tolerance: 0.6, aireMin: 1.5, couperAuCadre: true });
    if (r.length) voisins.push({ id: pay.id, nom: pay.nom, d: r.map((x) => trace(x.points, true)).join("") });
  }
  // Les fleuves de l'Hexagone : les tronçons de Natural Earth réunis sous leur nom français.
  const FLEUVES = { Seine: "Seine", Loire: "Loire", Garonne: "Garonne", "Rhône": "Rhône", Rhin: "Rhin", Rhine: "Rhin", Rhein: "Rhin" };
  const traces = new Map(), points = new Map();
  for (const f of fleuves.features) {
    const nom = FLEUVES[f.properties.name];
    if (!nom) continue;
    for (const l of lignesDe(f.geometry)) for (const m of couperLigne(l.map(prep.p), prep.boite)) {
      const s = simplifier(m, 0.45, false);
      (traces.get(nom) ?? traces.set(nom, []).get(nom)).push(trace(s, false));
      (points.get(nom) ?? points.set(nom, []).get(nom)).push(...s);
    }
  }
  const lignes = [...traces].map(([nom, ds]) => {
    const id = nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return { id, nom, d: ds.join(""), centre: surLeCours(points.get(nom), prep.p(ANCRES[id])) };
  });
  // Les massifs : les régions « montagne » ou « plateau » de Natural Earth ; la Corse, île montagneuse, en entier.
  const MASSIFS = { ALPS: "Alpes", PYRENEES: "Pyrénées", "Massif Central": "Massif central", Jura: "Jura", Vosges: "Vosges" };
  const zones = [];
  for (const f of geo.features) {
    const nom = MASSIFS[f.properties.NAME];
    if (!nom) continue;
    const r = formes(anneaux(f.geometry), prep, { tolerance: 0.6, aireMin: 4, couperAuCadre: true });
    const id = nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");
    zones.push({ id, nom, d: r.map((x) => trace(x.points, true)).join(""), centre: prep.p(ANCRES[id]).map(arrondi) });
  }
  const corse = regions.find((x) => x.id === "COR");
  zones.push({ id: "corse", nom: "Corse", d: corse.d, centre: corse.centre });
  // L'outre-mer : un encart par région, chacun à son échelle, en ligne sous l'Hexagone.
  const ENCARTS = [
    ["GLP", [-61.9, 15.8, -60.95, 16.55]], ["MTQ", [-61.3, 14.35, -60.75, 14.9]], ["GUF", [-54.8, 2.0, -51.4, 5.9]],
    ["REU", [55.15, -21.45, 55.9, -20.85]], ["MYT", [44.95, -13.05, 45.35, -12.6]],
  ];
  // Sous les encarts, une bande pour leurs noms.
  const cote = 180, ecart = (largeur - ENCARTS.length * cote) / (ENCARTS.length - 1), haut = prep.hauteur + 30, BANDE_DES_NOMS = 34;
  const encarts = ENCARTS.map(([id, cadre], i) => {
    const centreLon = (cadre[0] + cadre[2]) / 2, centreLat = (cadre[1] + cadre[3]) / 2;
    const pe = preparer({ projection: lambert(centreLon, centreLat), sorte: { sorte: "lambert", lon0: centreLon, lat0: centreLat }, cadre, largeur: cote });
    const echelle = Math.min(1, cote / pe.hauteur);
    const dx = i * (cote + ecart) + (cote - cote * echelle) / 2, dy = haut + (cote - pe.hauteur * echelle) / 2;
    const p = (c) => { const [x, y] = pe.p(c); return [dx + x * echelle, dy + y * echelle]; };
    const projection = { ...pe.projection, k: pe.projection.k * echelle, dx: dx + pe.projection.dx * echelle, dy: dy + pe.projection.dy * echelle };
    const polys = parRegion.get(id).polys;
    const r = formes(polys, { p, boite: null }, { tolerance: 0.35, aireMin: 0.8, couperAuCadre: false });
    const region = { id, nom: parRegion.get(id).nom, d: r.map((x) => trace(x.points, true)).join(""), centre: etiquette(r) };
    return { region, cadre: { id, nom: region.nom, x: arrondi(i * (cote + ecart)), y: arrondi(haut), l: cote, h: cote, projection }, p };
  });
  // Le Maroni, en Guyane : la frontière avec le Suriname.
  const guyane = encarts.find((e) => e.cadre.id === "GUF");
  const coursDuMaroni = fleuves.features.filter((f) => f.properties.name === "Maroni").flatMap((f) => lignesDe(f.geometry)).map((l) => simplifier(l.map(guyane.p), 0.3, false));
  if (coursDuMaroni.length) lignes.push({ id: "maroni", nom: "Maroni", d: coursDuMaroni.map((l) => trace(l, false)).join(""), centre: surLeCours(coursDuMaroni.flat(), guyane.p(ANCRES.maroni)) });
  for (const e of encarts) regions.push(e.region);
  return { largeur, hauteur: arrondi(haut + cote + BANDE_DES_NOMS), hexagone: prep.hauteur, projection: prep.projection, formes: regions, voisins, lignes, zones, cadres: encarts.map((e) => e.cadre) };
}

// ── L'écriture du module ──────────────────────────────────────────────────

const fonds = { monde: fondMonde(), europe: fondEurope(), france: fondFrance() };
const arrondir = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === "number" && ["k", "dx", "dy", "lon0", "lat0"].includes(k) ? Number(v.toPrecision(10)) : v)));
const json = (v) => JSON.stringify(arrondir(v));
const texte = `// Les fonds de carte de l'histoire-géographie du cours moyen : le planisphère,
// l'Europe, la France et ses régions. Fichier fabriqué par
// outils/fonds-de-carte.mjs à partir de Natural Earth (domaine public,
// naturalearthdata.com) : ne pas le modifier à la main.
//
// Le planisphère est en projection Equal Earth ; l'Europe et la France, en
// projection azimutale équivalente de Lambert. Les régions viennent des
// départements de Natural Earth, fondus ; l'outre-mer est en encarts, chacun
// à son échelle. Les tracés sont des chemins SVG, simplifiés.

/**
 * Une projection : celle du fond — Equal Earth, ou la projection azimutale
 * équivalente de Lambert centrée sur (lon0, lat0) —, puis l'échelle \`k\` et le
 * décalage qui la posent sur le fond.
 */
export interface ProjectionDeCarte { sorte: "equal-earth" | "lambert"; lon0?: number; lat0?: number; k: number; dx: number; dy: number }
/** Une forme : un pays, une région, un fleuve, un massif ; \`centre\` : où écrire son numéro ; \`europe\` : un pays du continent européen. */
export interface FormeDeCarte { id: string; nom: string; d: string; centre?: [number, number]; europe?: boolean }
/** Un fond : ses dimensions, sa projection, ses formes. */
export interface FondDeCarte {
  largeur: number;
  hauteur: number;
  projection: ProjectionDeCarte;
  formes: FormeDeCarte[];
  /** Les pays voisins, en gris (la France). */
  voisins?: FormeDeCarte[];
  /** Les fleuves (la France). */
  lignes?: FormeDeCarte[];
  /** Les massifs (la France). */
  zones?: FormeDeCarte[];
  /** Le continent européen dans ses limites conventionnelles (l'Europe). */
  continent?: string;
  /** La hauteur de l'Hexagone, au-dessus des encarts (la France). */
  hexagone?: number;
  /** Les encarts de l'outre-mer, chacun avec sa projection (la France). */
  cadres?: { id: string; nom: string; x: number; y: number; l: number; h: number; projection: ProjectionDeCarte }[];
}

export const FOND_MONDE: FondDeCarte = ${json(fonds.monde)};

export const FOND_EUROPE: FondDeCarte = ${json(fonds.europe)};

export const FOND_FRANCE: FondDeCarte = ${json(fonds.france)};
`;
writeFileSync(sortie, texte);
console.log(`écrit : ${sortie} (${(texte.length / 1024).toFixed(0)} Ko) — monde ${fonds.monde.formes.length} pays, Europe ${fonds.europe.formes.length}, `
  + `France ${fonds.france.formes.length} régions, ${fonds.france.lignes.length} fleuves, ${fonds.france.zones.length} massifs`);
