// La monnaie : des pièces et des billets pour jouer, et des feuilles pour
// compter, payer, comparer, rendre la monnaie.
//
// Programme de mathématiques du cycle 2 (2024) : au CP, la valeur en euros
// d'un ensemble de pièces et de billets, une somme à constituer, deux
// ensembles à comparer, des achats simulés « avec des pièces et des billets
// fictifs » ; au CE1, les centimes, puis le sens de l'écriture à virgule ;
// au CE2, rendre la monnaie et calculer sur des montants. Guide « Pour
// enseigner les nombres, le calcul et la résolution de problèmes au CP »
// (Éduscol, 2021), « Quels matériels… ? », exemple 3 : la monnaie, dont les
// éléments s'introduisent « en fonction du champ numérique travaillé » — les
// billets de cent euros et les centimes au CE1.
//
// Les pièces et les billets sont dessinés simplement, à leurs couleurs, la
// valeur écrite en grand, et marqués « pour jouer » : ce ne sont pas des
// reproductions. Les montants se comptent en centimes, pour rester entiers.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export type ExerciceMonnaie = "valeur" | "constituer" | "unEuro" | "comparer" | "ordonner" | "rendre" | "ecriture" | "planche";

export const EXERCICES_MONNAIE: { id: ExerciceMonnaie; libelle: string }[] = [
  { id: "valeur", libelle: "Combien d'argent ? — trouver la valeur" },
  { id: "constituer", libelle: "Payer juste — constituer une somme" },
  { id: "unEuro", libelle: "1 € de plusieurs façons — les centimes (CE1)" },
  { id: "comparer", libelle: "Qui a le plus ? — comparer deux porte-monnaie" },
  { id: "ordonner", libelle: "Ranger des prix, quelle que soit leur écriture" },
  { id: "rendre", libelle: "À la marchande — rendre la monnaie" },
  { id: "ecriture", libelle: "L'écriture à virgule — euros et centimes" },
  { id: "planche", libelle: "Pièces et billets à découper" },
];

export interface ReglagesMonnaie {
  exercice: ExerciceMonnaie;
  /** Le plus grand montant, en euros. */
  jusqua: number;
  /** Les pièces de 1 à 50 centimes. */
  centimes: boolean;
  /** Les montants écrits avec une virgule : 3,50 €. */
  virgule: boolean;
  combien: number;
  /** Payer avec le moins de pièces et de billets possible. */
  moinsDePieces: boolean;
  /** Sans pièce de 1 € : « Produire 56 € […] sans utiliser de pièces de 1 € » (CP) ; des centimes pour faire les euros (CE1). */
  sansPiecesDe1: boolean;
}

export const REGLAGES_MONNAIE: ReglagesMonnaie = { exercice: "valeur", jusqua: 20, centimes: false, virgule: false, combien: 6, moinsDePieces: false, sansPiecesDe1: false };

export const PLAFONDS_MONNAIE = [10, 20, 50, 100, 1000];

/** Les pièces et les billets, en centimes. */
export const PIECES = [1, 2, 5, 10, 20, 50, 100, 200];
export const BILLETS = [500, 1000, 2000, 5000, 10000];

/**
 * Ce qu'on a dans la caisse : les pièces d'euro et les billets jusqu'au
 * plafond ; les centimes si on les veut. Le billet de cent euros vient au
 * CE1, avec les centimes (guide CP) — au CP, les montants ne dépassent pas
 * cent euros. Sans pièce de 1 €, quand on l'a décidé.
 */
export function especes(r: Pick<ReglagesMonnaie, "jusqua" | "centimes"> & Partial<Pick<ReglagesMonnaie, "sansPiecesDe1">>): number[] {
  const plafond = Math.max(5, r.jusqua) * 100;
  const billets = BILLETS.filter((b) => b <= plafond && (b < 10000 || r.centimes || r.jusqua > 100));
  return [...PIECES.filter((p) => (r.centimes || p >= 100) && !(r.sansPiecesDe1 && p === 100)), ...billets].sort((a, b) => a - b);
}

const deux = (n: number) => String(n).padStart(2, "0");
const milliers = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** Un montant comme on l'écrit : « 17 € », « 3 € 50 c », « 3,50 € ». */
export function montant(c: number, virgule: boolean): string {
  const euros = Math.floor(c / 100), centimes = c % 100;
  if (virgule) return `${milliers(euros)},${deux(centimes)} €`;
  if (!centimes) return `${milliers(euros)} €`;
  return euros ? `${milliers(euros)} € ${centimes} c` : `${centimes} c`;
}

/** Le nom d'une pièce ou d'un billet : « un billet de 10 € », « une pièce de 50 c ». */
export const nomEspece = (v: number) => (v >= 500 ? `un billet de ${v / 100} €` : `une pièce de ${v >= 100 ? `${v / 100} €` : `${v} c`}`);

/**
 * Une somme avec le moins de pièces et de billets possible. Prendre chaque
 * fois le plus grand qui ne dépasse pas suffit d'ordinaire ; sans pièce de
 * 1 €, il faut chercher : 53 € = 20 € + 20 € + 5 € + 2 € + 2 € + 2 € + 2 €.
 * Rien quand la somme ne peut pas se faire.
 */
export function decomposer(c: number, disponibles: number[]): number[] {
  if (c <= 0) return [];
  const valeurs = [...new Set(disponibles)].filter((v) => v > 0).sort((a, b) => b - a);
  const meilleur = new Array<number>(c + 1).fill(Infinity), dernier = new Array<number>(c + 1).fill(0);
  meilleur[0] = 0;
  for (let x = 1; x <= c; x++) {
    for (const v of valeurs) if (v <= x && meilleur[x - v] + 1 < meilleur[x]) { meilleur[x] = meilleur[x - v] + 1; dernier[x] = v; }
  }
  if (!Number.isFinite(meilleur[c])) return [];
  const sortie: number[] = [];
  for (let x = c; x > 0; x -= dernier[x]) sortie.push(dernier[x]);
  return sortie.sort((a, b) => b - a);
}

// ── Le dessin ─────────────────────────────────────────────────────────────

/** Les diamètres des pièces, en millimètres ; leurs couleurs : cuivre, or, et les deux pièces bicolores. */
const DIAMETRES: Record<number, number> = { 1: 16.25, 2: 18.75, 5: 21.25, 10: 19.75, 20: 22.25, 50: 24.25, 100: 23.25, 200: 25.75 };
const CUIVRE = ["#d08a55", "#8a4f26"], OR = ["#e2bd52", "#9b7020"], ARGENT = ["#d5d8de", "#7c818c"];

/** Une pièce, à sa taille réelle multipliée par `echelle`. */
export function pieceSvg(v: number, echelle = 1): string {
  const d = (DIAMETRES[v] ?? 22) * echelle, r = 50;
  const texte = v >= 100 ? `${v / 100} €` : `${v} c`;
  const [fond, trait] = v < 10 ? CUIVRE : v < 100 ? OR : v === 100 ? ARGENT : OR;
  const coeur = v === 100 ? `<circle cx="50" cy="50" r="33" fill="${OR[0]}" stroke="${OR[1]}" stroke-width="1.5"/>`
    : v === 200 ? `<circle cx="50" cy="50" r="33" fill="${ARGENT[0]}" stroke="${ARGENT[1]}" stroke-width="1.5"/>` : "";
  return `<svg class="mo-piece" viewBox="0 0 100 100" width="${d.toFixed(1)}mm" height="${d.toFixed(1)}mm"><circle cx="50" cy="50" r="${r - 2}" fill="${fond}" stroke="${trait}" stroke-width="3"/>${coeur}`
    + `<text x="50" y="51" text-anchor="middle" dominant-baseline="central" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="${texte.length > 3 ? 27 : 31}" fill="#1c2233">${texte}</text></svg>`;
}

/** Les billets : leur taille réelle et leur couleur. */
const BILLET: Record<number, { l: number; h: number; fond: string; bande: string }> = {
  500: { l: 120, h: 62, fond: "#e4e6ea", bande: "#9da3ad" },
  1000: { l: 127, h: 67, fond: "#f6d5d0", bande: "#d9675b" },
  2000: { l: 133, h: 72, fond: "#d7e3f6", bande: "#5d88cf" },
  5000: { l: 140, h: 77, fond: "#fbe2c4", bande: "#e8913a" },
  10000: { l: 147, h: 77, fond: "#d8eed8", bande: "#55a35d" },
};

/** Un billet, à sa taille réelle multipliée par `echelle`, marqué « pour jouer ». */
export function billetSvg(v: number, echelle = 0.34): string {
  const b = BILLET[v] ?? BILLET[500];
  const valeur = String(v / 100);
  return `<svg class="mo-billet" viewBox="0 0 ${b.l} ${b.h}" width="${(b.l * echelle).toFixed(1)}mm" height="${(b.h * echelle).toFixed(1)}mm">`
    + `<rect x="1" y="1" width="${b.l - 2}" height="${b.h - 2}" rx="5" fill="${b.fond}" stroke="${b.bande}" stroke-width="2"/>`
    + `<rect x="1" y="1" width="${b.l * 0.3}" height="${b.h - 2}" rx="5" fill="${b.bande}"/>`
    + `<text x="${b.l * 0.15}" y="${b.h / 2 + 1}" text-anchor="middle" dominant-baseline="central" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="${valeur.length > 2 ? 17 : 22}" fill="#fff">€</text>`
    + `<text x="${b.l * 0.64}" y="${b.h * 0.47}" text-anchor="middle" dominant-baseline="central" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="${b.h * (valeur.length > 2 ? 0.38 : 0.5)}" fill="#1c2233">${valeur} €</text>`
    + `<text x="${b.l * 0.64}" y="${b.h * 0.86}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="7.5" fill="#46506a">pour jouer</text></svg>`;
}

/** Sur les feuilles, les pièces aux sept dixièmes de leur taille, les billets au quart : six objets tiennent dans un porte-monnaie. */
const dessin = (v: number) => (v >= 500 ? billetSvg(v, 0.25) : pieceSvg(v, 0.7));

/** Un porte-monnaie : les billets, puis les pièces, dans l'ordre où on les a tirés. */
const contenu = (especesTirees: number[]) => `<div class="mo-objets">${especesTirees.map((v) => dessin(v)).join("")}</div>`;

// ── Les tirages ───────────────────────────────────────────────────────────

const entre = (alea: () => number, a: number, b: number) => a + Math.floor(alea() * (b - a + 1));

/** Un ensemble de pièces et de billets dont la valeur reste sous le plafond : de trois à six objets. */
export function porteMonnaie(r: ReglagesMonnaie, alea: () => number, objets = entre(alea, 3, r.jusqua <= 10 ? 5 : 6)): number[] {
  const dispo = especes(r), plafond = r.jusqua * 100;
  for (let garde = 0; garde < 200; garde++) {
    const tirees: number[] = [];
    let total = 0;
    for (let i = 0; i < objets; i++) {
      const possibles = dispo.filter((v) => total + v <= plafond);
      if (!possibles.length) break;
      // Les billets ne viennent pas plus d'une fois sur trois : on compte surtout des pièces.
      const v = possibles[Math.floor(alea() * possibles.length)];
      if (v >= 500 && tirees.filter((x) => x >= 500).length >= 2) continue;
      tirees.push(v);
      total += v;
    }
    // Au moins deux sortes d'objets, et des centimes quand on les a demandés.
    if (tirees.length >= 3 && new Set(tirees).size >= 2 && (!r.centimes || tirees.some((v) => v < 100))) return melanger(alea, tirees);
  }
  return [100, 200, 500].filter((v) => v <= plafond);
}

const total = (liste: number[]) => liste.reduce((s, v) => s + v, 0);
const somme = (liste: number[], virgule: boolean) => [...liste].sort((a, b) => b - a).map((v) => montant(v, virgule)).join(" + ");

/** Un montant à payer : des euros entiers, ou des euros et des centimes ronds — 3 € 40 c, 7 € 05 c. */
export function montantAuHasard(r: ReglagesMonnaie, alea: () => number, min = 3): number {
  const haut = Math.max(1, r.jusqua - 1);
  const euros = entre(alea, Math.min(min, haut), haut);
  if (!r.centimes) return euros * 100;
  const centimes = [5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 65, 70, 75, 80, 90, 95][Math.floor(alea() * 16)];
  return euros * 100 + centimes;
}

/** Ce qu'on achète, et à peu près son prix : en euros entiers, ou avec des centimes. */
const ARTICLES: { nom: string; de: number; a: number; centimes?: boolean }[] = [
  { nom: "un cahier", de: 2, a: 4 }, { nom: "une trousse", de: 6, a: 12 }, { nom: "un ballon", de: 5, a: 15 }, { nom: "un livre", de: 6, a: 18 },
  { nom: "un puzzle", de: 8, a: 19 }, { nom: "une peluche", de: 9, a: 25 }, { nom: "un jeu de cartes", de: 3, a: 8 }, { nom: "une petite voiture", de: 2, a: 7 },
  { nom: "une bande dessinée", de: 9, a: 16 }, { nom: "un sac à dos", de: 15, a: 45 }, { nom: "un jeu de société", de: 18, a: 39 }, { nom: "une paire de baskets", de: 29, a: 79 },
  { nom: "une baguette", de: 1, a: 1, centimes: true }, { nom: "un croissant", de: 0, a: 1, centimes: true }, { nom: "une gomme", de: 0, a: 1, centimes: true },
  { nom: "un stylo", de: 1, a: 3, centimes: true }, { nom: "une bouteille de jus", de: 1, a: 3, centimes: true }, { nom: "un magazine", de: 3, a: 6, centimes: true },
  { nom: "une boîte de crayons", de: 4, a: 9, centimes: true }, { nom: "un paquet de gâteaux", de: 1, a: 4, centimes: true },
];

const PRENOMS = ["Léa", "Tom", "Inès", "Noah", "Jade", "Adam", "Lina", "Sacha", "Emma", "Yanis", "Chloé", "Rayan"];

export interface Achat { prenom: string; articles: { nom: string; prix: number }[]; prix: number; paye: number[]; rendu: number }

/**
 * Des achats : un article à son prix — ou deux, une fois sur trois, qu'on
 * paie ensemble —, payés avec un billet ou une pièce qui dépasse ; la
 * monnaie à rendre.
 */
export function achats(r: ReglagesMonnaie, graine: number): Achat[] {
  const alea = hasard(graine);
  const dispo = especes(r);
  const sortie: Achat[] = [];
  const vus = new Set<string>();
  const article = () => {
    const possibles = ARTICLES.filter((a) => (r.centimes ? true : !a.centimes) && a.de * 100 < r.jusqua * 100 && !vus.has(a.nom));
    if (!possibles.length) return null;
    const a = possibles[Math.floor(alea() * possibles.length)];
    const euros = entre(alea, a.de, Math.max(a.de, Math.min(a.a, r.jusqua - 1)));
    const centimes = r.centimes && (a.centimes || alea() < 0.5) ? [10, 20, 25, 30, 40, 50, 60, 65, 68, 70, 75, 80, 90, 95][Math.floor(alea() * 14)] : 0;
    return { nom: a.nom, prix: euros * 100 + centimes };
  };
  for (let garde = 0; sortie.length < Math.max(1, Math.min(8, r.combien)) && garde < 2000; garde++) {
    const premier = article();
    if (!premier || premier.prix <= 0) continue;
    const second = sortie.length % 3 === 2 ? article() : null;
    const articles = second && second.nom !== premier.nom && second.prix > 0 ? [premier, second] : [premier];
    const prix = articles.reduce((t, a) => t + a.prix, 0);
    // On paie avec le plus petit billet — ou la pièce de 2 € — qui suffit, parfois avec le suivant.
    const grands = dispo.filter((v) => v >= 200 && v > prix);
    if (!grands.length) continue;
    const billet = grands[Math.min(grands.length - 1, alea() < 0.75 ? 0 : 1)];
    for (const a of articles) vus.add(a.nom);
    sortie.push({ prenom: PRENOMS[Math.floor(alea() * PRENOMS.length)], articles, prix, paye: [billet], rendu: billet - prix });
  }
  return sortie;
}

/**
 * Rendre la monnaie « en procédant par ajouts successifs » (programme, CE2) :
 * jusqu'à l'euro rond, puis jusqu'à la dizaine, puis jusqu'à ce qui est donné.
 * « Le complément à 100 de 68 est 32, donc je rends 32 centimes pour arriver
 * à 4 €, plus 1 € pour arriver à 5 €. »
 */
export function ajoutsSuccessifs(prix: number, donne: number, virgule: boolean): string {
  const etapes: string[] = [];
  let ici = prix;
  const vers = (cible: number) => { if (cible > ici && cible <= donne) { etapes.push(`${montant(cible - ici, virgule)} pour arriver à ${montant(cible, virgule)}`); ici = cible; } };
  vers(Math.ceil(ici / 100) * 100);
  vers(Math.ceil(ici / 1000) * 1000);
  vers(donne);
  return etapes.join(", plus ");
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const SOURCE = `<span style="color:#687087">— Programme de mathématiques du cycle 2, 2024 ; guide CP, Éduscol 2021.</span>`;
const entete = (titre: string, consigne: string) => `<div class="titre">${titre}</div>
  <div class="sous">Prénom : ........................................ Date : ........................</div>
  <div class="regle">${consigne} ${SOURCE}</div>`;

/** La ligne de réponse, selon qu'on écrit les centimes à part ou avec la virgule. */
function ligneReponse(r: ReglagesMonnaie, debut: string): string {
  const blanc = (large = false) => `<span class="mo-blanc${large ? " mo-blanc-large" : ""}"></span>`;
  const corps = r.virgule ? `${blanc()}<b>,</b>${blanc()} €` : r.centimes ? `${blanc()} € ${blanc()} c` : `${blanc(true)} €`;
  return `<div class="mo-reponse">${escapeHtml(debut)} ${corps}</div>`;
}

const pages = (blocs: string[], tete: string, parPage: number) => {
  const sortie: string[] = [];
  for (let i = 0; i < Math.max(1, blocs.length); i += parPage) sortie.push(`<div class="page">${tete}<div class="mo-grille">${blocs.slice(i, i + parPage).join("")}</div></div>`);
  return sortie.join("");
};

/** Combien d'argent ? Des porte-monnaie à compter. */
function feuilleValeur(r: ReglagesMonnaie, graine: number): string {
  const alea = hasard(graine);
  const liste = Array.from({ length: Math.max(1, Math.min(12, r.combien)) }, () => porteMonnaie(r, alea));
  const blocs = liste.map((p, i) => `<div class="mo-bourse"><div class="mo-num">${i + 1}</div>${contenu(p)}${ligneReponse(r, "Il y a")}</div>`);
  const tete = entete("Combien d'argent ?", "Compte l'argent de chaque porte-monnaie : commence par les billets, puis les plus grosses pièces. Écris combien il y a.");
  const corrige = `<div class="page corrige"><div class="titre">Combien d'argent ? — corrigé</div><div class="mo-corrige">${liste.map((p, i) => `<div>${i + 1}. ${somme(p, r.virgule)} = <b>${montant(total(p), r.virgule)}</b></div>`).join("")}</div></div>`;
  return pages(blocs, tete, 6) + corrige;
}

/** Payer juste : constituer une somme, avec ou sans le moins de pièces possible. */
function feuilleConstituer(r: ReglagesMonnaie, graine: number): string {
  const alea = hasard(graine);
  const dispo = especes(r);
  const vus = new Set<number>();
  const sommes: number[] = [];
  for (let garde = 0; sommes.length < Math.max(1, Math.min(12, r.combien)) && garde < 500; garde++) {
    const s = montantAuHasard(r, alea);
    // Une somme qu'on peut faire avec ce qu'il y a dans la caisse : sans pièce de 1 €, pas de 3 €.
    if (!vus.has(s) && decomposer(s, dispo).length) { vus.add(s); sommes.push(s); }
  }
  const blocs = sommes.map((s, i) => `<div class="mo-bourse mo-payer"><div class="mo-num">${i + 1}</div><div class="mo-prix">Paie <b>${montant(s, r.virgule)}</b></div><div class="mo-cadre">Dessine ou colle les pièces et les billets.</div></div>`);
  const sans = r.sansPiecesDe1 ? " sans utiliser de pièce de 1 €" : "";
  const consigne = r.moinsDePieces
    ? `Paie juste chaque somme avec le moins de pièces et le moins de billets possible${sans} : dessine-les, ou colle ceux que tu as découpés.`
    : `Paie juste chaque somme${sans} : dessine les pièces et les billets, ou colle ceux que tu as découpés. Il y a plusieurs façons de faire.`;
  const corrige = `<div class="page corrige"><div class="titre">Payer juste — corrigé</div><div class="mo-corrige">${sommes.map((s, i) => `<div>${i + 1}. <b>${montant(s, r.virgule)}</b> = ${somme(decomposer(s, dispo), r.virgule)}${r.moinsDePieces ? "" : " (une façon parmi d'autres)"}</div>`).join("")}</div></div>`;
  return pages(blocs, entete("Payer juste", consigne), 6) + corrige;
}

/** Qui a le plus ? Deux porte-monnaie : parfois, celui qui a le plus de pièces a le moins d'argent. */
function feuilleComparer(r: ReglagesMonnaie, graine: number): string {
  const alea = hasard(graine);
  const paires: [number[], number[]][] = [];
  for (let garde = 0; paires.length < Math.max(1, Math.min(8, r.combien)) && garde < 3000; garde++) {
    const a = porteMonnaie(r, alea), b = porteMonnaie(r, alea);
    if (total(a) === total(b)) continue;
    // Une fois sur deux, le piège : plus d'objets, moins d'argent.
    const piege = paires.length % 2 === 1;
    const plusDObjets = a.length > b.length ? a : b.length > a.length ? b : null;
    if (piege && (!plusDObjets || total(plusDObjets) > total(plusDObjets === a ? b : a))) continue;
    paires.push([a, b]);
  }
  const blocs = paires.map(([a, b], i) => `<div class="mo-paire"><div class="mo-num">${i + 1}</div>
    <div class="mo-duo"><div class="mo-bourse"><div class="mo-lettre">A</div>${contenu(a)}</div><div class="mo-bourse"><div class="mo-lettre">B</div>${contenu(b)}</div></div></div>`);
  const tete = entete("Qui a le plus d'argent ?", "Pour chaque paire, entoure le porte-monnaie où il y a le plus d'argent. Attention : le plus de pièces ne fait pas toujours le plus d'argent !");
  const corrige = `<div class="page corrige"><div class="titre">Qui a le plus d'argent ? — corrigé</div><div class="mo-corrige">${paires.map(([a, b], i) => `<div>${i + 1}. A : ${montant(total(a), r.virgule)} ; B : ${montant(total(b), r.virgule)} — <b>${total(a) > total(b) ? "A" : "B"}</b> a le plus d'argent.</div>`).join("")}</div></div>`;
  const sortie: string[] = [];
  for (let i = 0; i < blocs.length; i += 3) sortie.push(`<div class="page">${tete}<div class="mo-paires">${blocs.slice(i, i + 3).join("")}</div></div>`);
  return sortie.join("") + corrige;
}

/** À la marchande : l'article, son prix, ce qu'on donne ; la monnaie à rendre. */
function feuilleRendre(r: ReglagesMonnaie, graine: number): string {
  const liste = achats(r, graine);
  const dispo = especes(r);
  const quoi = (a: Achat) => (a.articles.length > 1
    ? `${a.prenom} achète ${a.articles.map((x) => `${x.nom} à ${montant(x.prix, r.virgule)}`).join(" et ")}. ${a.prenom} paie le tout avec ${nomEspece(a.paye[0])}.`
    : `${a.prenom} achète ${a.articles[0].nom} à ${montant(a.prix, r.virgule)}. ${a.prenom} paie avec ${nomEspece(a.paye[0])}.`);
  const blocs = liste.map((a, i) => `<div class="mo-achat"><div class="mo-num">${i + 1}</div>
    <div class="mo-enonce">${escapeHtml(quoi(a))} <b>Combien lui rend-on ?</b></div>
    <div class="mo-paye">${contenu(a.paye)}<div class="mo-cadre mo-cadre-bas">Mes calculs</div></div>${ligneReponse(r, "On lui rend")}</div>`);
  const tete = entete("À la marchande — rendre la monnaie", "Lis l'achat. Cherche combien il faut ajouter au prix pour arriver à ce qui est donné : c'est la monnaie à rendre.");
  const total = (a: Achat) => (a.articles.length > 1 ? `${a.articles.map((x) => montant(x.prix, r.virgule)).join(" + ")} = ${montant(a.prix, r.virgule)} ; ` : "");
  const corrige = `<div class="page corrige"><div class="titre">Rendre la monnaie — corrigé</div><div class="mo-corrige">${liste.map((a, i) => `<div>${i + 1}. ${total(a)}on rend <b>${montant(a.rendu, r.virgule)}</b> : ${ajoutsSuccessifs(a.prix, a.paye[0], r.virgule)} — par exemple ${somme(decomposer(a.rendu, dispo), r.virgule)}.</div>`).join("")}</div></div>`;
  const sortie: string[] = [];
  for (let i = 0; i < blocs.length; i += 4) sortie.push(`<div class="page">${tete}<div class="mo-achats">${blocs.slice(i, i + 4).join("")}</div></div>`);
  return sortie.join("") + corrige;
}

/** Une écriture à transformer : l'énoncé avec ses blancs, et la réponse. */
export interface Ecriture { enonce: string; reponse: string }

const blancM = `<span class="mo-blanc"></span>`;

/**
 * Les écritures d'une somme d'argent, d'après les exemples du programme
 * (CE1) : « 2 € et 17 centimes s'écrit aussi 2,17 € », « 2 € et 5 centimes
 * s'écrit 2,05 € », « 345 centimes = 300 centimes + 45 centimes = 3 € + 45
 * centimes », « 85 centimes = 0,85 € », « 17 € = 17,00 € », « 1 € et 120
 * centimes = […] = 2,20 € ».
 */
export function ecritures(r: Pick<ReglagesMonnaie, "jusqua" | "combien">, graine: number): Ecriture[] {
  const alea = hasard(graine);
  const haut = Math.min(Math.max(2, r.jusqua - 1), 99);
  // Des centimes de toutes sortes, dont ceux qui s'écrivent avec un zéro : 2,05 €.
  const centimes = () => (alea() < 0.3 ? entre(alea, 1, 9) : entre(alea, 10, 99));
  const modeles: (() => Ecriture)[] = [
    () => { const e = entre(alea, 1, haut), c = centimes(); return { enonce: `${e} € et ${c} centimes = ${blancM}<b>,</b>${blancM} €`, reponse: montant(e * 100 + c, true) }; },
    () => { const e = entre(alea, 1, haut), c = centimes(); return { enonce: `${montant(e * 100 + c, true)} = ${blancM} € et ${blancM} centimes`, reponse: `${e} € et ${c} centimes` }; },
    () => { const x = entre(alea, 101, 999); return { enonce: `${x} centimes = ${blancM} € et ${blancM} centimes`, reponse: `${Math.floor(x / 100)} € et ${x % 100} centimes` }; },
    () => { const c = entre(alea, 10, 99); return { enonce: `${c} centimes = ${blancM}<b>,</b>${blancM} €`, reponse: montant(c, true) }; },
    () => { const e = entre(alea, 1, haut); return { enonce: `${e} € = ${blancM}<b>,</b>${blancM} €`, reponse: montant(e * 100, true) }; },
    () => { const e = entre(alea, 1, 5), c = entre(alea, 101, 190); return { enonce: `${e} € et ${c} centimes = ${blancM}<b>,</b>${blancM} €`, reponse: montant(e * 100 + c, true) }; },
    () => { const e = entre(alea, 2, 9); return { enonce: `${e * 100} centimes = ${blancM} €`, reponse: `${e} €` }; },
  ];
  const sortie: Ecriture[] = [];
  const vus = new Set<string>();
  for (let i = 0; sortie.length < Math.max(2, Math.min(14, r.combien)) && i < 500; i++) {
    const e = modeles[i % modeles.length]();
    if (!vus.has(e.enonce)) { vus.add(e.enonce); sortie.push(e); }
  }
  return sortie;
}

/** L'écriture à virgule : 2 € et 17 centimes s'écrit 2,17 € ; la virgule repère le chiffre des unités d'euro. */
function feuilleEcriture(r: ReglagesMonnaie, graine: number): string {
  const liste = ecritures(r, graine);
  const lignes = liste.map((e, i) => `<div class="mo-ecriture"><span class="mo-num-l">${i + 1}.</span> ${e.enonce}</div>`).join("");
  const tete = entete("Euros et centimes : l'écriture à virgule", "100 centimes font 1 euro. La virgule repère le chiffre des unités d'euros : dans 2,17 €, il y a 2 € et 17 centimes ; dans 2,05 €, 2 € et 5 centimes ; dans 2,50 €, 2 € et 50 centimes. Écris chaque somme de l'autre façon.");
  const corrige = `<div class="page corrige"><div class="titre">L'écriture à virgule — corrigé</div><div class="mo-corrige">${liste.map((e, i) => `<div>${i + 1}. <b>${e.reponse}</b></div>`).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="mo-ecritures">${lignes}</div></div>${corrige}`;
}

/**
 * 1 € de plusieurs façons : « une pièce d'un euro a la même valeur que cent
 * pièces d'un centime » ; « constituer une somme de 1 € de différentes
 * manières » (programme, CE1). Chaque case pose sa contrainte.
 */
export const CONTRAINTES_UN_EURO: { consigne: string; exemple: number[] }[] = [
  { consigne: "avec deux pièces", exemple: [50, 50] },
  { consigne: "avec des pièces de 20 c seulement", exemple: [20, 20, 20, 20, 20] },
  { consigne: "avec des pièces de 10 c seulement", exemple: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10] },
  { consigne: "avec quatre pièces", exemple: [50, 20, 20, 10] },
  { consigne: "avec des pièces de 50 c, de 20 c et de 10 c", exemple: [50, 20, 10, 10, 10] },
  { consigne: "avec cinq pièces", exemple: [50, 20, 10, 10, 10] },
  { consigne: "comme tu veux, mais sans pièce de 50 c", exemple: [20, 20, 20, 20, 10, 10] },
  { consigne: "avec des pièces de 5 c et de 10 c", exemple: [10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 5] },
];

function feuilleUnEuro(r: ReglagesMonnaie): string {
  const liste = CONTRAINTES_UN_EURO.filter((c) => c.exemple.length && total(c.exemple) === 100).slice(0, Math.max(2, Math.min(8, r.combien)));
  const blocs = liste.map((c, i) => `<div class="mo-bourse mo-payer"><div class="mo-num">${i + 1}</div><div class="mo-prix">Fais <b>1 €</b> ${c.consigne}.</div><div class="mo-cadre">Dessine ou colle les pièces.</div></div>`);
  const tete = entete("1 € de plusieurs façons", "Une pièce de 1 € vaut autant que 100 pièces de 1 centime : 1 € = 100 centimes. Dans chaque case, fais 1 € avec des pièces de centimes, comme on te le demande.");
  const corrige = `<div class="page corrige"><div class="titre">1 € de plusieurs façons — corrigé</div><div class="mo-corrige">${liste.map((c, i) => `<div>${i + 1}. ${c.consigne} : par exemple <b>${somme(c.exemple, false)} = 1 €</b></div>`).join("")}</div></div>`;
  return pages(blocs, tete, 6) + corrige;
}

/** Quatre prix à ranger, écrits de façons différentes : « 12 € c'est plus que 60 centimes bien que 12 soit plus petit que 60 ». */
export function prixARanger(r: Pick<ReglagesMonnaie, "jusqua" | "virgule" | "combien">, graine: number): { prix: number[]; ecrits: string[] }[] {
  const alea = hasard(graine);
  const sortie: { prix: number[]; ecrits: string[] }[] = [];
  const ecrire = (c: number, i: number) => {
    const formes = [
      () => (c % 100 ? `${Math.floor(c / 100)} € et ${c % 100} centimes` : `${c / 100} €`),
      () => `${c} centimes`,
      () => (r.virgule ? montant(c, true) : `${Math.floor(c / 100)} € ${c % 100} c`),
      () => montant(c, false),
    ];
    return formes[(i + Math.floor(alea() * 4)) % formes.length]();
  };
  for (let k = 0; k < Math.max(1, Math.min(6, Math.ceil(r.combien / 2))); k++) {
    // Des prix proches, dont un en centimes qui paraît grand : 60 centimes, 12 €…
    const base = entre(alea, 1, Math.min(9, Math.max(2, r.jusqua - 1)));
    const prix = new Set<number>();
    for (let garde = 0; prix.size < 4 && garde < 100; garde++) prix.add(Math.max(5, base * 100 + 5 * entre(alea, -30, 30)));
    const liste = [...prix];
    sortie.push({ prix: liste, ecrits: liste.map((c, i) => (c < 100 ? `${c} centimes` : ecrire(c, i))) });
  }
  return sortie;
}

function feuilleOrdonner(r: ReglagesMonnaie, graine: number): string {
  const series = prixARanger(r, graine);
  const blocs = series.map((s, i) => `<div class="mo-serie"><div class="mo-num-l">${i + 1}.</div><div class="mo-etiquettes">${s.ecrits.map((e) => `<span class="mo-etiquette">${e}</span>`).join("")}</div>
    <div class="mo-reponse">Du moins cher au plus cher : ${s.ecrits.map(() => `<span class="mo-blanc mo-blanc-large"></span>`).join(" &lt; ")}</div></div>`).join("");
  const tete = entete("Du moins cher au plus cher", "Range les prix du moins cher au plus cher. Attention aux écritures : 12 €, c'est plus que 60 centimes, même si 12 est plus petit que 60. Écris d'abord les prix de la même façon.");
  const corrige = `<div class="page corrige"><div class="titre">Ranger des prix — corrigé</div><div class="mo-corrige">${series.map((s, i) => `<div>${i + 1}. ${s.prix.map((c, k) => ({ c, e: s.ecrits[k] })).sort((a, b) => a.c - b.c).map((x) => `${x.e} (${montant(x.c, true)})`).join(" &lt; ")}</div>`).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="mo-series">${blocs}</div></div>${corrige}`;
}

/** La planche à découper : de chaque pièce et de chaque billet, de quoi jouer à plusieurs. */
function feuillePlanche(r: ReglagesMonnaie): string {
  const dispo = especes(r);
  const pieces = dispo.filter((v) => v < 500), billets = dispo.filter((v) => v >= 500);
  // De quoi jouer à deux ou trois, sur une page de pièces et une page de billets.
  const combienDe = (v: number) => (v >= 5000 ? 2 : v >= 500 ? 3 : v >= 100 ? 6 : 5);
  const planchePieces = `<div class="mo-planche">${pieces.flatMap((v) => Array.from({ length: combienDe(v) }, () => `<span class="mo-decoupe mo-rond">${pieceSvg(v, 1)}</span>`)).join("")}</div>`;
  const plancheBillets = `<div class="mo-planche">${billets.flatMap((v) => Array.from({ length: combienDe(v) }, () => `<span class="mo-decoupe">${billetSvg(v, 0.5)}</span>`)).join("")}</div>`;
  const tete = (quoi: string) => `<div class="titre">${quoi} à découper</div><div class="regle">Des ${quoi.toLowerCase()} pour jouer, à découper en suivant les pointillés : pour compter, payer, rendre la monnaie, jouer à la marchande. ${quoi === "Pièces" ? "Les pièces sont à leur taille réelle." : "Les billets sont deux fois plus petits que les vrais."} ${SOURCE}</div>`;
  return `<div class="page">${tete("Pièces")}${planchePieces}</div>${billets.length ? `<div class="page">${tete("Billets")}${plancheBillets}</div>` : ""}`;
}

export function htmlMonnaie(r: ReglagesMonnaie, graine: number): string {
  const corps = r.exercice === "constituer" ? feuilleConstituer(r, graine)
    : r.exercice === "unEuro" ? feuilleUnEuro(r)
    : r.exercice === "ordonner" ? feuilleOrdonner(r, graine)
    : r.exercice === "comparer" ? feuilleComparer(r, graine)
      : r.exercice === "rendre" ? feuilleRendre(r, graine)
        : r.exercice === "ecriture" ? feuilleEcriture(r, graine)
          : r.exercice === "planche" ? feuillePlanche(r)
            : feuilleValeur(r, graine);
  return feuille(corps, "mo");
}

export const STYLE_MONNAIE = `
  .feuille.mo .mo-grille { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .feuille.mo .mo-bourse { position: relative; border: 1.2px solid #9aa0b4; border-radius: 4mm; padding: 4mm 3mm 3mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.mo .mo-num { position: absolute; top: 1.2mm; left: 2.2mm; font-size: 10px; font-weight: 700; color: #687087; }
  .feuille.mo .mo-lettre { position: absolute; top: 1mm; left: 2.5mm; font-size: 13px; font-weight: 800; }
  .feuille.mo .mo-objets { display: flex; flex-wrap: wrap; align-items: center; gap: 2mm; min-height: 18mm; padding: 1mm 0 1mm 3mm; }
  .feuille.mo .mo-piece, .feuille.mo .mo-billet { flex: none; }
  .feuille.mo .mo-reponse { margin-top: 2mm; font-size: 14px; font-weight: 600; line-height: 2; }
  .feuille.mo .mo-blanc { display: inline-block; width: 12mm; height: 6mm; margin: 0 1mm; border-bottom: 2px dotted #1c2233; }
  .feuille.mo .mo-blanc-large { width: 22mm; }
  .feuille.mo .mo-payer { min-height: 48mm; }
  .feuille.mo .mo-prix { font-size: 15px; margin: 0 0 2mm 3mm; }
  .feuille.mo .mo-prix b { font-size: 19px; }
  .feuille.mo .mo-cadre { border: 1.5px dashed #c4c9d6; border-radius: 3mm; min-height: 34mm; font-size: 10.5px; color: #9aa0b4; padding: 1.5mm 2mm; }
  .feuille.mo .mo-cadre-bas { min-height: 16mm; flex: 1; }
  .feuille.mo .mo-paires { display: block; }
  .feuille.mo .mo-paire { position: relative; page-break-inside: avoid; break-inside: avoid; padding-left: 5mm; margin-bottom: 4mm; }
  .feuille.mo .mo-paire > .mo-num { top: 0; left: 0; font-size: 12px; }
  .feuille.mo .mo-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .feuille.mo .mo-achats { display: block; }
  .feuille.mo .mo-achat { position: relative; border: 1.2px solid #9aa0b4; border-radius: 4mm; padding: 4mm 4mm 3mm 7mm; margin-bottom: 4mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.mo .mo-enonce { font-size: 14px; line-height: 1.45; margin-bottom: 2mm; }
  .feuille.mo .mo-paye { display: flex; align-items: stretch; gap: 4mm; }
  .feuille.mo .mo-paye .mo-objets { min-height: 0; flex: none; }
  .feuille.mo .mo-ecritures { display: block; margin-top: 4mm; }
  .feuille.mo .mo-ecriture { font-size: 17px; font-weight: 600; line-height: 2.4; }
  .feuille.mo .mo-num-l { font-size: 12px; color: #687087; margin-right: 1mm; }
  .feuille.mo .mo-corrige { font-size: 13px; line-height: 1.7; }
  .feuille.mo .mo-series { display: block; margin-top: 3mm; }
  .feuille.mo .mo-serie { display: grid; grid-template-columns: 6mm 1fr; row-gap: 3mm; margin-bottom: 7mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.mo .mo-serie .mo-reponse { grid-column: 2; }
  .feuille.mo .mo-etiquettes { display: flex; flex-wrap: wrap; gap: 4mm; }
  .feuille.mo .mo-etiquette { border: 1.5px solid #1c2233; border-radius: 2mm; padding: 1.5mm 3mm; font-size: 15px; font-weight: 700; background: #fffbe8; }
  .feuille.mo .mo-planche { display: block; line-height: 0; }
  .feuille.mo .mo-decoupe { display: inline-block; vertical-align: middle; padding: 1mm; margin: 0 2mm 2mm 0; border: 1px dashed #9aa0b4; }
  .feuille.mo .mo-rond { border-radius: 50%; }
`;
