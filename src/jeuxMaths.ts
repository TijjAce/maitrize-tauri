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
    <div class="regle"><b>Mémory</b>Cartes face cachée ; on en retourne deux : le même nombre sous deux formes différentes fait une paire.
      <b style="margin-top:4px">Bataille</b>Chacun retourne une carte, quelle que soit sa forme ; le plus grand nombre remporte le pli.
      <b style="margin-top:4px">Loto</b>Les nombres écrits en chiffres sur les planches, les autres écritures à piocher.
      <span style="color:#687087">— Livret Mathématiques CP, Éduscol 2025 : passer d'une représentation à une autre.</span></div>`;
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

export function htmlCartesCalcul(cartes: CarteCalcul[], r: ReglagesCalcul): string {
  // Ce que disent les nombres choisis : la table de multiplication, le premier terme de l'addition, la différence de la soustraction.
  const nom = r.operation === "x" ? "tables de multiplication de" : r.operation === "+" ? "tables d'addition de" : "soustractions dont la différence est";
  const regle = `<div class="titre">Cartes de calcul — ${nom} ${r.tables.join(", ")}</div>
    <div class="regle"><b>Se tester</b>On lit la carte, on dit le résultat, on retourne pour vérifier — en classe et à la maison.
      <b style="margin-top:4px">Bataille</b>Chacun retourne une carte et calcule ; le plus grand résultat remporte le pli. À égalité, bataille !
      <span style="color:#687087">— Livrets Mathématiques CE1 et CE2, Éduscol 2025 : jeux de cartes et cartes recto-verso pour mémoriser.</span></div>`;
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

export function htmlArbreCalcul(liste: Addition[], r: ReglagesArbre): string {
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
  const regle = `<div class="titre">Arbre à calcul — ajouter deux nombres</div>
    <div class="regle"><b>Comment faire</b>Je décompose chaque nombre en dizaines et unités, j'ajoute les dizaines entre elles, les unités entre elles, puis je recompose la somme.
      L'arbre soutient le raisonnement ; l'objectif est de finir par s'en passer.
      <span style="color:#687087">— Livret Mathématiques CP, Éduscol 2025.</span></div><div class="sous">Prénom : ........................................ Date : ........................</div>`;
  return feuille(`<div class="page">${regle}<div class="ar-grille">${liste.map(arbre).join("")}</div></div>`, "ar");
}

// ── Les fractions : cartes, bandes, règle, nageurs ────────────────────────

export type RepresentationFraction = "chiffres" | "lettres" | "bande" | "disque";
export type MaterielFraction = "cartes" | "bandes" | "regle" | "nageurs";

export interface ReglagesFractions {
  denominateurs: number[];
  representations: RepresentationFraction[];
  materiel: MaterielFraction[];
  /** La règle graduée : en quarts ou en dixièmes. */
  graduation: 4 | 10;
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
    for (let k = 1; k < n; k++) {
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

/** La règle graduée, trois unités, en quarts ou en dixièmes. */
export function regleSvg(graduation: 4 | 10, unites = 3, uMm = 50): string {
  const w = unites * uMm * 4, h = 60; // 4 px par mm
  let corps = `<rect x="0" y="0" width="${w + 40}" height="${h}" fill="#fff" stroke="#1c2233" stroke-width="2"/>`;
  for (let u = 0; u <= unites; u++) {
    const x = 20 + u * uMm * 4;
    corps += `<line x1="${x}" y1="0" x2="${x}" y2="34" stroke="#1c2233" stroke-width="2.5"/><text x="${x}" y="52" text-anchor="middle" font-size="16" font-family="Helvetica, Arial, sans-serif">${u} u</text>`;
    if (u === unites) break;
    for (let g = 1; g < graduation; g++) {
      const xg = x + (g / graduation) * uMm * 4;
      const moitie = graduation === 10 && g === 5;
      corps += `<line x1="${xg}" y1="0" x2="${xg}" y2="${moitie ? 26 : 16}" stroke="#1c2233" stroke-width="${moitie ? 2 : 1.2}"/>`;
    }
  }
  return `<svg viewBox="0 0 ${w + 40} ${h}" width="${(w + 40) / 4}mm" height="${h / 4}mm">${corps}</svg>`;
}

/** Les cartes de la course des nageurs : des longueurs en fractions d'unité, de 1/10 à 1 u + 9/10. */
export function cartesNageurs(graduation: 4 | 10): string[] {
  const sortie: string[] = [];
  for (let entier = 0; entier <= 1; entier++) {
    for (let k = 1; k < graduation; k++) {
      sortie.push(`<div class="fr-nageur">${entier ? `<span class="fr-entier">1 u +</span>` : ""}${fractionHtml(k, graduation)}<span class="fr-u">u</span></div>`);
    }
  }
  return sortie;
}

export function htmlFractions(r: ReglagesFractions, graine: number): string {
  const parties: string[] = [];
  if (r.materiel.includes("cartes")) {
    const cartes = melanger(hasard(graine), cartesFractions(r));
    const regle = `<div class="titre">Cartes des fractions — ${r.denominateurs.map((n) => `en ${fractionEnLettres(2, n).split(" ")[1]}`).join(", ")}</div>
      <div class="regle"><b>Mémory</b>Cartes face cachée ; on en retourne deux : la même fraction sous deux formes différentes fait une paire. Cartes face visible d'abord, pour apprendre.
        <b style="margin-top:4px">Bataille des fractions</b>Chacun retourne une carte ; la plus grande fraction remporte le pli. Pour comparer, on regarde les dessins : pour un même tout partagé en parts égales, plus il y a de parts, plus chaque part est petite.
        <span style="color:#687087">— Livret Mathématiques CE1, Éduscol 2025.</span></div>`;
    parties.push(pagesDeCartes(cartes.map((c) => carte(c.html)), { colonnes: 4, lignes: 5 }, regle));
  }
  if (r.materiel.includes("bandes")) {
    const bande = (repere: string) => `<div class="fr-bande">${repere}</div>`;
    parties.push(`<div class="page"><div class="titre">Bandes unités à plier</div>
      <div class="regle">On plie la bande unité en deux, puis en quatre ; on marque les plis. Une bande pliée en dix pour les dixièmes.
        Les bandes repérées servent à vérifier. <span style="color:#687087">— Livret Mathématiques CE2, Éduscol 2025.</span></div>
      <div class="sous">Bandes vierges (1 u = 15 cm)</div>${[1, 2, 3, 4].map(() => bande("")).join("")}
      <div class="sous">Bande repérée en quarts</div>${bande(`<div class="fr-reperes">${[1, 2, 3].map((g) => `<span style="left:${g * 25}%"></span>`).join("")}</div>`)}
      <div class="sous">Bande repérée en dixièmes</div>${bande(`<div class="fr-reperes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => `<span style="left:${g * 10}%"></span>`).join("")}</div>`)}</div>`);
  }
  if (r.materiel.includes("regle")) {
    parties.push(`<div class="page"><div class="titre">Règle graduée en ${r.graduation === 4 ? "quarts" : "dixièmes"} d'unité</div>
      <div class="regle">Une règle où l'unité vaut 5 cm, graduée en ${r.graduation === 4 ? "quarts" : "dixièmes"} : pour mesurer et tracer des longueurs quand les entiers ne suffisent plus. À découper et coller sur du carton.
        <span style="color:#687087">— Livret Mathématiques CE2, Éduscol 2025.</span></div>
      <div style="margin:8mm 0">${regleSvg(r.graduation)}</div><div style="margin:8mm 0">${regleSvg(r.graduation)}</div><div style="margin:8mm 0">${regleSvg(r.graduation)}</div></div>`);
  }
  if (r.materiel.includes("nageurs")) {
    const regle = `<div class="titre">La course des nageurs</div>
      <div class="regle"><b>Règle du jeu</b>Par groupes de trois, sur une feuille A3. À son tour, on pioche une carte et on trace, depuis le bord de départ puis depuis l'extrémité de son dernier segment, un segment de la longueur indiquée, avec la règle graduée.
        Le premier qui atteint ou dépasse l'autre bord a gagné — on finit le tour, il peut y avoir des ex aequo. Une ligne bien droite va plus vite qu'une ligne brisée.
        <span style="color:#687087">— Livret Mathématiques CE2, Éduscol 2025.</span></div>`;
    parties.push(pagesDeCartes(cartesNageurs(r.graduation).map((c) => carte(c)), { colonnes: 3, lignes: 6, hauteurMm: 38 }, regle));
  }
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
export function patronDeSvg(faces: FacesDe): string {
  const c = 110;
  const positions: [number, number][] = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];
  const valeurs = faces === "1-3" ? [1, 2, 3, 1, 2, 3] : [1, 2, 3, 4, 5, 6];
  const places: Record<number, [number, number][]> = {
    1: [[55, 55]], 2: [[30, 30], [80, 80]], 3: [[30, 30], [55, 55], [80, 80]], 4: [[30, 30], [80, 30], [30, 80], [80, 80]],
    5: [[30, 30], [80, 30], [55, 55], [30, 80], [80, 80]], 6: [[30, 30], [80, 30], [30, 55], [80, 55], [30, 80], [80, 80]],
  };
  const corps = positions.map(([col, ligne], i) => {
    const x = col * c, y = ligne * c, v = valeurs[i];
    const contenu = faces === "chiffres"
      ? `<text x="${x + 55}" y="${y + 70}" text-anchor="middle" font-size="44" font-weight="700" font-family="Helvetica, Arial, sans-serif">${v}</text>`
      : (places[v] ?? []).map(([px, py]) => `<circle cx="${x + px}" cy="${y + py}" r="9" fill="#1c2233"/>`).join("");
    return `<rect x="${x}" y="${y}" width="${c}" height="${c}" fill="#fff" stroke="#1c2233" stroke-width="2"/>${contenu}`;
  }).join("");
  // Les languettes de collage.
  const languettes = `<path d="M${c} 0 l-14 14 v82 l14 14 M${3 * c} ${c} l14 14 v82 l-14 14 M${2 * c} ${2 * c} l14 0 v82 l-14 14 M${c} ${3 * c} l0 14 h${c} l0 -14" fill="none" stroke="#9aa0b4" stroke-dasharray="4 3"/>`;
  return `<svg viewBox="-20 -20 ${4 * c + 40} ${3 * c + 40}" width="120mm" height="90mm">${corps}${languettes}</svg>`;
}

export function htmlJeuDeLOie(r: ReglagesOie, graine: number): string {
  const cases = casesOie(r, graine);
  const quoi = r.contenu === "nombres" ? "les nombres" : r.contenu === "lettres" ? "les lettres" : r.contenu === "syllabes" ? "les syllabes" : "";
  const regle = `<div class="titre">Jeu de l'oie${quoi ? ` — ${quoi}` : ""}</div>
    <div class="regle"><b>Règle du jeu</b>Chacun lance le dé et avance son pion d'autant de cases${quoi ? ` ; on lit ce que dit la case où l'on arrive` : ""}.
      Les cases jaunes font avancer, reculer, rejouer ou passer son tour. Le premier arrivé a gagné.
      <span style="color:#687087">— Livrets « Résolution de problèmes » (la piste du type jeu de l'oie, pour les déplacements) et Français CP (le jeu de l'oie des lettres), Éduscol 2025.</span></div>`;
  const de = r.de === "aucun" ? "" : `<div class="page"><div class="titre">Le dé — patron à plier</div>
    <div class="regle">Découper sur les traits pleins, plier sur les traits des faces, coller les languettes. ${r.de === "1-3" ? "Les faces vont de 1 à 3, deux fois : pour les petits déplacements." : r.de === "chiffres" ? "Les faces portent les chiffres." : "Les faces portent les constellations, comme un dé ordinaire."}
      <span style="color:#687087">— Programme de l'école maternelle 2025 : apprendre en jouant, jeux de société.</span></div>
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
`;
