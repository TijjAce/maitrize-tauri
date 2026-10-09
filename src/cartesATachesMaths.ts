// Les cartes à tâches de mathématiques : nombres, calcul, grandeurs et
// mesures, espace et géométrie.
//
// Chaque type tire une carte à la fois, d'après la classe : le champ des
// nombres du programme (jusqu'à 100 au CP, 1 000 au CE1, 10 000 au CE2, les
// grands nombres et les décimaux au cycle 3), les solides et les figures que
// la classe nomme. Les dessins viennent des ateliers de Fabriquer — les
// solides, l'horloge, la monnaie, les cubes —, pour que la carte montre ce que
// la classe a déjà manipulé.
//
// Les fausses réponses d'une carte à pinces ne sont pas tirées au hasard :
// ce sont les erreurs qu'on rencontre — les chiffres inversés, le zéro
// oublié, l'aire prise pour le périmètre, la petite aiguille lue comme la
// grande. Une carte réussie dit que l'élève sait ; une carte ratée dit
// souvent pourquoi.

import {
  BLANC, aTailleReelle, auPlusCE2, classesDe, dansLOrdre, dessin, enGrand, entre, fractionHtml, nombresFaux, parmi, propositions, rang, sansChoix, texte,
  type Carte, type Classe, type Contexte, type TypeDeCarte,
} from "./cartesATachesOutils";
import { melanger } from "./hasard";
import { fr } from "./nombres";
import { nombreEnLettres } from "./nombresEnLettres";
import { constellationSvg, bandeSvg, disqueSvg } from "./jeuxMaths";
import { dessinerCubes, REGLAGES_CUBES } from "./cubesNumeration";
import { OBJECTIFS, objectifsDuNiveau, tirerCalcul, virgule, type Niveau } from "./faitsNumeriques";
import { problemePartieTout, problemeMultiplicatif, type TypeMultiplicatif } from "./problemesBarres";
import { horlogeSvg, lireHeure, durees, ecrireDuree, PAS_MINUTES, PRECISIONS_HEURE, type Heure, type PrecisionHeure } from "./heure";
import { pieceSvg, billetSvg, porteMonnaie, montant, REGLAGES_MONNAIE } from "./monnaie";
import { referencesPour, unitesConnues, segmentSvg, conversions, type Grandeur } from "./mesures";
import { solideSvg, dimensionsAuHasard, SOLIDES_DE_LA_CLASSE, nomASavoir, type Solide } from "./solides";
import { figureAuHasard, FIGURES_DE_LA_CLASSE, FIGURES_AXES, type NomFigure } from "./geometrie";

const NOIR = "#1c2233", ROUGE = "#d33a32", BLEU = "#2454e6";
const f2 = (x: number) => Number(x.toFixed(2));
type P = [number, number];

const PROGRAMME_C2 = "Programme de mathématiques du cycle 2 (2024)";
const PROGRAMME_C3 = "Programme de mathématiques du cycle 3 (2025)";
const programmes = (classes: Classe[]) => {
  const c2 = classes.some((c) => rang(c) <= rang("CE2")), c3 = classes.some((c) => rang(c) >= rang("CM1"));
  return [c2 ? PROGRAMME_C2 : "", c3 ? PROGRAMME_C3 : ""].filter(Boolean).join(" ; ");
};

// ── Les nombres, écrits et retournés ──────────────────────────────────────

/** Les chiffres d'un entier, du plus grand rang au plus petit. */
const chiffresDe = (n: number) => String(n).split("").map(Number);
const depuisChiffres = (c: number[]) => Number(c.join(""));

/**
 * Les erreurs qu'on fait en lisant ou en écrivant un nombre : deux chiffres
 * échangés, un zéro oublié ou ajouté, un rang de trop ou de moins.
 */
export function erreursDeNumeration(n: number, alea: () => number): number[] {
  const c = chiffresDe(n);
  const sortie: number[] = [];
  // Deux chiffres échangés : 34 → 43, 305 → 350.
  for (let i = 0; i < c.length - 1; i++) {
    if (c[i] === c[i + 1]) continue;
    const e = [...c];
    [e[i], e[i + 1]] = [e[i + 1], e[i]];
    if (e[0] !== 0) sortie.push(depuisChiffres(e));
  }
  // Un zéro oublié : 3 020 → 320.
  c.forEach((x, i) => { if (x === 0 && i > 0) sortie.push(depuisChiffres(c.filter((_, k) => k !== i))); });
  // Un zéro de trop : 3 020 → 30 020.
  if (c.includes(0) && c.length > 2) { const i = c.indexOf(0); sortie.push(depuisChiffres([...c.slice(0, i), 0, ...c.slice(i)])); }
  return melanger(alea, sortie);
}

/** Un voisin d'un rang : n ± 1, ± 10, ± 100… */
const voisinsDeRang = (n: number) => chiffresDe(n).flatMap((_, k) => [n + 10 ** k, n - 10 ** k]);

// ── Combien ? ─────────────────────────────────────────────────────────────

/** Des points semés sans se toucher, comme une collection posée sur la table. */
export function pointsEnVrac(alea: () => number, n: number): string {
  const r = 6, d = n > 14 ? 14 : 16;
  const pts: P[] = [];
  for (let essai = 0; pts.length < n && essai < 6000; essai++) {
    const p: P = [r + 3 + alea() * (100 - 2 * r - 6), r + 3 + alea() * (100 - 2 * r - 6)];
    if (pts.every(([x, y]) => (x - p[0]) ** 2 + (y - p[1]) ** 2 >= d * d)) pts.push(p);
  }
  if (pts.length < n) return boitesDeDix(n);
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${pts.map(([x, y]) => `<circle cx="${f2(x)}" cy="${f2(y)}" r="${r}" fill="${NOIR}"/>`).join("")}</svg>`;
}

/** Des boîtes de dix, deux rangées de cinq : un jeton par case remplie — les cases se comptent une à une. */
export function boitesDeDix(n: number): string {
  const boites = Math.max(1, Math.ceil(n / 10));
  const c = 10, ecart = 6;
  let corps = "";
  for (let b = 0; b < boites; b++) {
    for (let i = 0; i < 10; i++) {
      const x = 1 + (i % 5) * c, y = 1 + b * (2 * c + ecart) + Math.floor(i / 5) * c;
      corps += `<rect x="${x}" y="${y}" width="${c}" height="${c}" fill="#fff" stroke="${NOIR}" stroke-width="0.8"/>`;
      if (b * 10 + i < n) corps += `<circle cx="${x + c / 2}" cy="${y + c / 2}" r="${c * 0.34}" fill="${NOIR}"/>`;
    }
  }
  return `<svg viewBox="0 0 ${5 * c + 2} ${boites * 2 * c + (boites - 1) * ecart + 2}" xmlns="http://www.w3.org/2000/svg">${corps}</svg>`;
}

const COMBIEN: TypeDeCarte = {
  id: "combien", nom: "Combien ?", domaine: "Nombres", classes: ["GS", "CP"], formats: ["pinces", "tache"],
  source: "Programme de l'école maternelle (2021) : dénombrer une collection ; " + PROGRAMME_C2,
  options: [{
    cle: "forme", libelle: "La collection",
    valeurs: () => [["melange", "Points en vrac, dés et boîtes de dix, mêlés"], ["vrac", "Des points en vrac"], ["de", "Les points du dé"], ["boite", "La boîte de dix"]],
    defaut: () => "melange",
  }],
  tirer(ctx) {
    const max = ctx.classe === "GS" ? 10 : 20;
    const n = entre(ctx.alea, ctx.classe === "GS" ? 1 : 4, max);
    let forme = ctx.options.forme;
    if (forme === "melange") forme = parmi(ctx.alea, n <= 12 ? ["vrac", "de", "boite"] : ["vrac", "boite"]);
    // Deux dés font douze au plus.
    if (forme === "de" && n > 12) return null;
    const svg = forme === "vrac" ? pointsEnVrac(ctx.alea, n) : forme === "de" ? constellationSvg(n) : boitesDeDix(n);
    const faux = [...melanger(ctx.alea, [n - 1, n + 1]), ...melanger(ctx.alea, [n - 2, n + 2])];
    const p = propositions(ctx.alea, String(n), nombresFaux(n, faux, 1, max + 2).map(String));
    return {
      question: forme === "boite" ? "Combien de jetons ?" : "Combien de points ?",
      visuel: dessin(svg), ...p, reponse: String(n), cle: `${forme}:${n}`,
    };
  },
};

// ── Quel nombre ? (cubes, barres, plaques) ────────────────────────────────

/**
 * Un nombre dont le dessin se lit : sur une carte, neuf plaques et neuf barres
 * ne se comptent plus. Au-delà du CP, chaque groupement garde peu de pièces —
 * et le zéro, qui piège, revient souvent.
 */
function nombreEnCubes(ctx: Contexte): number {
  const a = ctx.alea;
  const pince = ctx.format === "pinces";
  const zero = (max: number) => (a() < 0.25 ? 0 : entre(a, 1, max));
  if (ctx.classe === "CP") return 10 * entre(a, 1, 9) + entre(a, 0, 9);
  if (ctx.classe === "CE1") return 100 * entre(a, 1, pince ? 3 : 5) + 10 * zero(pince ? 5 : 9) + zero(pince ? 5 : 9);
  return 1000 * entre(a, 1, 2) + 100 * zero(3) + 10 * zero(4) + zero(5);
}

const CUBES: TypeDeCarte = {
  id: "cubes", nom: "Quel nombre ? — cubes, barres, plaques", domaine: "Nombres", classes: ["CP", "CE1", "CE2"], formats: ["pinces", "tache"],
  source: PROGRAMME_C2 + " : unités, dizaines, centaines, milliers, avec le matériel",
  tirer(ctx) {
    const n = nombreEnCubes(ctx);
    const svg = dessinerCubes(n, 2.4, REGLAGES_CUBES.couleurs).svg;
    const max = ctx.classe === "CP" ? 100 : ctx.classe === "CE1" ? 1000 : 10000;
    const faux = nombresFaux(n, [...erreursDeNumeration(n, ctx.alea), ...melanger(ctx.alea, voisinsDeRang(n))], 1, max);
    const p = propositions(ctx.alea, fr(n), faux.map((x) => fr(x)));
    return { question: "Quel est ce nombre ?", visuel: dessin(svg), ...p, reponse: fr(n), cle: String(n) };
  },
};

// ── La droite graduée ─────────────────────────────────────────────────────

interface Graduation { debut: number; pas: number; echelle: number }

/** Une droite de dix intervalles, adaptée à la classe ; les valeurs sont des entiers, à diviser par `echelle`. */
function graduationDe(ctx: Contexte): Graduation {
  const a = ctx.alea;
  switch (ctx.classe) {
    case "CP": return { debut: 10 * entre(a, 0, 8), pas: 1, echelle: 1 };
    case "CE1": return a() < 0.5 ? { debut: 100 * entre(a, 0, 8), pas: 10, echelle: 1 } : { debut: 10 * entre(a, 10, 98), pas: 1, echelle: 1 };
    case "CE2": return parmi(a, [
      { debut: 1000 * entre(a, 0, 8), pas: 100, echelle: 1 }, { debut: 100 * entre(a, 10, 98), pas: 10, echelle: 1 }, { debut: 10 * entre(a, 100, 998), pas: 1, echelle: 1 },
    ]);
    case "CM1": return a() < 0.7 ? { debut: 10 * entre(a, 0, 19), pas: 1, echelle: 10 } : { debut: 10000 * entre(a, 1, 89), pas: 1000, echelle: 1 };
    default: return a() < 0.6 ? { debut: 10 * entre(a, 0, 99), pas: 1, echelle: 100 } : { debut: 10 * entre(a, 0, 49), pas: 1, echelle: 10 };
  }
}

const ecrireValeur = (v: number, echelle: number) => (echelle === 1 ? fr(v) : virgule(v, echelle));

/** La droite, ses graduations, trois nombres écrits et la flèche sur la graduation `k`. */
export function droiteSvg(g: Graduation, k: number): string {
  const x = (i: number) => 8 + i * 10.4;
  const ecrites = [0, 5, 10];
  const traits = Array.from({ length: 11 }, (_, i) => {
    const grand = ecrites.includes(i);
    return `<line x1="${f2(x(i))}" y1="${grand ? 13 : 15}" x2="${f2(x(i))}" y2="${grand ? 23 : 21}" stroke="${NOIR}" stroke-width="${grand ? 0.9 : 0.6}"/>`;
  }).join("");
  const nombres = ecrites.map((i) => `<text x="${f2(x(i))}" y="30" text-anchor="middle" font-size="5.2" font-weight="700" font-family="Helvetica, Arial, sans-serif" fill="${NOIR}">${ecrireValeur(g.debut + i * g.pas, g.echelle)}</text>`).join("");
  const fleche = `<path d="M${f2(x(k) - 2.6)} 3 L${f2(x(k) + 2.6)} 3 L${f2(x(k))} 10.5 Z" fill="${ROUGE}"/>`;
  return `<svg viewBox="0 0 120 33" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="18" x2="118" y2="18" stroke="${NOIR}" stroke-width="0.9"/><path d="M118 18 L114.5 16 L114.5 20 Z" fill="${NOIR}"/>${traits}${nombres}${fleche}</svg>`;
}

const DROITE: TypeDeCarte = {
  id: "droite", nom: "La droite graduée", domaine: "Nombres", classes: classesDe("CP"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CP")) + " : repérer un nombre sur une droite graduée",
  tirer(ctx) {
    const g = graduationDe(ctx);
    const k = parmi(ctx.alea, [1, 2, 3, 4, 6, 7, 8, 9]);
    const juste = g.debut + k * g.pas;
    // Compter les graduations de un en un quand elles vont de dix en dix ; se tromper d'une graduation.
    const faux = [g.pas !== 1 ? g.debut + k : NaN, juste + g.pas, juste - g.pas, juste + 2 * g.pas];
    const p = propositions(ctx.alea, ecrireValeur(juste, g.echelle), nombresFaux(juste, faux, 0).map((v) => ecrireValeur(v, g.echelle)));
    return {
      question: "Quel nombre montre la flèche ?", visuel: dessin(droiteSvg(g, k)), ...p,
      reponse: ecrireValeur(juste, g.echelle), cle: `${g.debut}:${g.pas}:${g.echelle}:${k}`,
    };
  },
};

// ── Des lettres aux chiffres ──────────────────────────────────────────────

/** Un nombre du champ de la classe, avec un zéro une fois sur trois : c'est lui qui piège. */
function nombreDeLaClasse(ctx: Contexte): number {
  const a = ctx.alea;
  const [de, jusqua] = ctx.classe === "CE1" ? [101, 999] : ctx.classe === "CE2" ? [1001, 9999] : ctx.classe === "CM1" ? [10001, 999999] : [100001, 999999999];
  const n = entre(a, de, jusqua);
  if (a() < 0.35) {
    const c = chiffresDe(n);
    const i = entre(a, 1, c.length - 1);
    c[i] = 0;
    return depuisChiffres(c);
  }
  return n;
}

const LETTRES: TypeDeCarte = {
  id: "lettres", nom: "Écris ce nombre en chiffres", domaine: "Nombres", classes: classesDe("CE1"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CE1")) + " : passer de l'écriture en lettres à l'écriture en chiffres",
  tirer(ctx) {
    const n = nombreDeLaClasse(ctx);
    const mots = nombreEnLettres(n);
    const faux = nombresFaux(n, [...erreursDeNumeration(n, ctx.alea), ...melanger(ctx.alea, voisinsDeRang(n))], 1);
    const p = propositions(ctx.alea, fr(n), faux.map((x) => fr(x)));
    return {
      question: ctx.format === "pinces" ? "Quel est ce nombre ?" : "Écris ce nombre en chiffres.",
      visuel: enGrand(texte(mots), mots.length > 40 ? "ct-texte-long" : mots.length > 22 ? "ct-texte-moyen" : ""),
      ...p, reponse: fr(n), cle: String(n),
    };
  },
};

// ── Le chiffre des…, le nombre de… ────────────────────────────────────────

const RANGS = ["unités", "dizaines", "centaines", "unités de mille", "dizaines de mille", "centaines de mille"];
const RANGS_DECIMAUX = ["dixièmes", "centièmes", "millièmes"];
/** Ce qu'on compte en tout : 4 372 a 437 dizaines, 43 centaines. */
const PAQUETS = ["unités", "dizaines", "centaines", "milliers", "dizaines de milliers"];

/** Les rangs qu'on interroge, d'après la classe : à droite de la virgule au cycle 3. */
function rangsDeLaClasse(c: Classe): { entiers: number; decimales: number } {
  return c === "CP" ? { entiers: 2, decimales: 0 } : c === "CE1" ? { entiers: 3, decimales: 0 } : c === "CE2" ? { entiers: 4, decimales: 0 }
    : c === "CM1" ? { entiers: 5, decimales: 2 } : { entiers: 6, decimales: 3 };
}

const CHIFFRE: TypeDeCarte = {
  id: "chiffre", nom: "Le chiffre des…, le nombre de…", domaine: "Nombres", classes: classesDe("CP"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CP")) + " : la valeur des chiffres selon leur rang",
  options: [{
    cle: "demande", libelle: "Ce qu'on demande",
    valeurs: (c) => c === "CP" ? [["chiffre", "Le chiffre des unités, des dizaines"]]
      : [["chiffre", "Le chiffre des… (dizaines, centaines…)"], ["nombre", "Le nombre de… (dizaines en tout)"], ["melange", "Les deux, mêlés"]],
    defaut: () => "chiffre",
  }],
  tirer(ctx) {
    const a = ctx.alea;
    const { entiers, decimales } = rangsDeLaClasse(ctx.classe);
    const demande = ctx.classe === "CP" ? "chiffre" : ctx.options.demande === "melange" ? parmi(a, ["chiffre", "nombre"]) : ctx.options.demande;
    // Des chiffres tous différents : la réponse ne se confond avec aucun autre.
    const avecDecimales = decimales > 0 && demande === "chiffre" && a() < 0.4;
    const nDec = avecDecimales ? entre(a, 1, decimales) : 0;
    const nEnt = avecDecimales ? entre(a, 1, 2) : entiers;
    const tous = melanger(a, [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    if (tous[0] === 0) tous.push(tous.shift()!);
    const chiffres = tous.slice(0, nEnt + nDec);
    const entier = depuisChiffres(chiffres.slice(0, nEnt));
    const ecrit = nDec ? `${fr(entier)},${chiffres.slice(nEnt).join("")}` : fr(entier);
    if (demande === "chiffre") {
      const rangs = [...RANGS.slice(0, nEnt).map((nom, k) => ({ nom, i: nEnt - 1 - k })), ...RANGS_DECIMAUX.slice(0, nDec).map((nom, k) => ({ nom, i: nEnt + k }))];
      const r = parmi(a, rangs);
      const juste = String(chiffres[r.i]);
      // Les chiffres voisins d'abord : c'est entre eux qu'on hésite.
      const voisins = [chiffres[r.i - 1], chiffres[r.i + 1], ...chiffres].filter((x) => x !== undefined).map(String);
      const p = propositions(a, juste, voisins);
      return { question: `Quel est le chiffre des ${r.nom} ?`, visuel: enGrand(ecrit, "ct-nombre"), ...p, reponse: juste, cle: `c:${ecrit}:${r.nom}` };
    }
    // Le nombre de dizaines (de centaines, de milliers) : 4 372 a 437 dizaines.
    const k = entre(a, 1, Math.max(1, Math.min(4, nEnt - 2)));
    const juste = Math.floor(entier / 10 ** k);
    const faux = nombresFaux(juste, [chiffres[nEnt - 1 - k], Math.floor(entier / 10 ** (k + 1)), Math.floor(entier / 10 ** Math.max(0, k - 1)), juste + 1], 0);
    const p = propositions(a, fr(juste), faux.map((x) => fr(x)));
    return { question: `Combien de ${PAQUETS[k]} en tout ?`, visuel: enGrand(ecrit, "ct-nombre"), ...p, reponse: fr(juste), cle: `n:${ecrit}:${k}` };
  },
};

// ── Comparer ──────────────────────────────────────────────────────────────

/** Un nombre et son écriture : une valeur exacte en fraction (num/den) pour comparer sans arrondi. */
export interface Ecrit { html: string; num: number; den: number }
const ent = (n: number): Ecrit => ({ html: fr(n), num: n, den: 1 });
const dec = (m: number, echelle: number): Ecrit => ({ html: virgule(m, echelle), num: m, den: echelle });
export const compare = (x: Ecrit, y: Ecrit) => Math.sign(x.num * y.den - y.num * x.den);

/** Deux écritures à comparer, avec les pièges de la classe. */
export function paireAComparer(ctx: Contexte): [Ecrit, Ecrit] | null {
  const a = ctx.alea;
  const egal = a() < 0.2;
  const c = ctx.classe;
  if (rang(c) <= rang("CE2")) {
    const max = c === "CP" ? 99 : c === "CE1" ? 999 : 9999;
    const x = entre(a, c === "CP" ? 11 : 101, max);
    if (egal) {
      // La même valeur, autrement écrite : 40 + 7 et 47 ; 5 centaines et 500.
      const ch = chiffresDe(x);
      const termes = ch.map((d, i) => d * 10 ** (ch.length - 1 - i)).filter((t) => t > 0);
      const autre = termes.length > 1 ? termes.map((t) => fr(t)).join(" + ") : `${ch[0]} ${RANGS[ch.length - 1]}`;
      return melanger(a, [ent(x), { html: autre, num: x, den: 1 }]) as [Ecrit, Ecrit];
    }
    const pieges = [...erreursDeNumeration(x, a), x + 1, x - 1, x + 10, x - 10].filter((y) => y > 0 && y <= max && y !== x);
    return melanger(a, [ent(x), ent(parmi(a, pieges))]) as [Ecrit, Ecrit];
  }
  // Cycle 3 : les décimaux — 3,5 et 3,45 ; 2,50 et 2,5 ; 0,7 et 0,65.
  if (egal) {
    const m = entre(a, 1, 99) * 10;
    return melanger(a, [dec(m, 100), { html: `${virgule(m, 100)}0`, num: m, den: 100 }]) as [Ecrit, Ecrit];
  }
  const entier = entre(a, 0, 20);
  const t = entre(a, 1, 9), h = entre(a, 1, 9);
  const court = dec(entier * 10 + t, 10);
  const long = dec(entier * 100 + (t + (a() < 0.5 ? -1 : 0)) * 10 + h, 100);
  return melanger(a, [court, long]) as [Ecrit, Ecrit];
}

const SIGNES = ["&lt;", "&gt;", "="].map((x) => `<span class="ct-signe">${x}</span>`);

const COMPARER: TypeDeCarte = {
  id: "comparer", nom: "Plus petit, plus grand ou égal : <, > ou =", domaine: "Nombres", classes: classesDe("CP"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CP")) + " : comparer, ranger, utiliser les signes <, > et =",
  tirer(ctx) {
    const paire = paireAComparer(ctx);
    if (!paire) return null;
    const [x, y] = paire;
    const s = SIGNES[compare(x, y) < 0 ? 0 : compare(x, y) > 0 ? 1 : 2];
    const p = ctx.format === "pinces" ? dansLOrdre(SIGNES, s) : sansChoix;
    return {
      question: "Quel signe faut-il ?", visuel: enGrand(`${x.html} ${BLANC} ${y.html}`, "ct-nombre"), ...p,
      ligne: "", reponse: `${x.html} ${s.replace(/<[^>]*>/g, "")} ${y.html}`, cle: `${x.html}|${y.html}`,
    };
  },
};

// ── Le plus grand ─────────────────────────────────────────────────────────

const PLUS_GRAND: TypeDeCarte = {
  id: "plusGrand", nom: "Le plus grand, le plus petit — ranger", domaine: "Nombres", classes: classesDe("CP"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CP")) + " : comparer et ranger des nombres",
  tirer(ctx) {
    const a = ctx.alea;
    let trois: Ecrit[];
    if (rang(ctx.classe) <= rang("CE2")) {
      const max = ctx.classe === "CP" ? 99 : ctx.classe === "CE1" ? 999 : 9999;
      const x = entre(a, ctx.classe === "CP" ? 12 : 102, max);
      const autres = nombresFaux(x, [...erreursDeNumeration(x, a), ...melanger(a, voisinsDeRang(x))], 1, max).slice(0, 2);
      trois = [x, ...autres].map(ent);
    } else {
      const entier = entre(a, 0, 9), t = entre(a, 2, 8);
      trois = [dec(entier * 10 + t, 10), dec(entier * 100 + (t - 1) * 10 + entre(a, 1, 9), 100), dec(entier * 1000 + t * 100 + entre(a, 1, 9), 1000)];
    }
    if (trois.length < 3 || new Set(trois.map((e) => e.num / e.den)).size < 3) return null;
    const ranges = [...trois].sort(compare);
    if (ctx.format === "tache") {
      return {
        question: "Range ces nombres du plus petit au plus grand.", visuel: enGrand(melanger(a, trois).map((e) => e.html).join(" ; "), "ct-nombre"), ...sansChoix,
        ligne: `${BLANC} &lt; ${BLANC} &lt; ${BLANC}`, reponse: ranges.map((e) => e.html).join(" &lt; "), cle: ranges.map((e) => e.html).join("|"),
      };
    }
    const grand = a() < 0.6;
    const juste = grand ? ranges[2] : ranges[0];
    const p = propositions(a, juste.html, trois.filter((e) => e !== juste).map((e) => e.html));
    return {
      question: grand ? "Quel est le plus grand nombre ?" : "Quel est le plus petit nombre ?",
      visuel: enGrand(grand ? "le plus<br>grand" : "le plus<br>petit", "ct-consigne-grande"), ...p, reponse: juste.html,
      cle: `${grand}:${ranges.map((e) => e.html).join("|")}`,
    };
  },
};

// ── Qui suis-je ? ─────────────────────────────────────────────────────────

export interface Indice { texte: string; vrai: (x: number) => boolean; direct?: boolean }

const NOMS_RANGS = ["unités", "dizaines", "centaines", "milliers"];
const chiffreDe = (x: number, k: number) => Math.floor(x / 10 ** k) % 10;

/** Ce qu'on peut dire d'un nombre, vrai pour lui : de quoi faire une devinette. */
export function indicesVrais(n: number, chiffres: number, alea: () => number): Indice[] {
  const sortie: Indice[] = [];
  for (let k = 0; k < chiffres; k++) {
    const d = chiffreDe(n, k), nom = NOMS_RANGS[k];
    sortie.push({ texte: k === 0 ? `Je me termine par ${d}.` : `Mon chiffre des ${nom} est ${d}.`, vrai: (x) => chiffreDe(x, k) === d, direct: true });
    if (d < 9) { const s = entre(alea, d + 1, Math.min(9, d + 4)); sortie.push({ texte: `Mon chiffre des ${nom} est plus petit que ${s}.`, vrai: (x) => chiffreDe(x, k) < s }); }
    if (d > (k === chiffres - 1 ? 1 : 0)) { const s = entre(alea, Math.max(0, d - 4), d - 1); sortie.push({ texte: `Mon chiffre des ${nom} est plus grand que ${s}.`, vrai: (x) => chiffreDe(x, k) > s }); }
    const pas = parmi(alea, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== d && (k < chiffres - 1 || x !== 0)));
    sortie.push({ texte: `Mon chiffre des ${nom} n'est pas ${pas}.`, vrai: (x) => chiffreDe(x, k) !== pas });
  }
  for (let k = 1; k < chiffres; k++) {
    const haut = chiffreDe(n, k), bas = chiffreDe(n, k - 1);
    if (haut === 2 * bas && bas > 0) sortie.push({ texte: `Mon chiffre des ${NOMS_RANGS[k]} est le double de mon chiffre des ${NOMS_RANGS[k - 1]}.`, vrai: (x) => chiffreDe(x, k) === 2 * chiffreDe(x, k - 1) });
    if (bas === 2 * haut && haut > 0) sortie.push({ texte: `Mon chiffre des ${NOMS_RANGS[k - 1]} est le double de mon chiffre des ${NOMS_RANGS[k]}.`, vrai: (x) => chiffreDe(x, k - 1) === 2 * chiffreDe(x, k) });
  }
  const somme = chiffresDe(n).reduce((s, x) => s + x, 0);
  sortie.push({ texte: `La somme de mes chiffres est ${somme}.`, vrai: (x) => chiffresDe(x).reduce((s, y) => s + y, 0) === somme });
  sortie.push(n % 2 === 0 ? { texte: "Je suis pair.", vrai: (x) => x % 2 === 0 } : { texte: "Je suis impair.", vrai: (x) => x % 2 === 1 });
  const unite = 10 ** (chiffres - 1);
  const bas = Math.floor(n / unite) * unite, haut = bas + unite;
  if (n > bas && n < haut) sortie.push({ texte: `Je suis entre ${fr(bas)} et ${fr(haut)}.`, vrai: (x) => x > bas && x < haut });
  const seuil = Math.round((n + entre(alea, 1, 3) * unite / 2) / (unite / 2)) * (unite / 2);
  if (seuil > n) sortie.push({ texte: `Je suis plus petit que ${fr(seuil)}.`, vrai: (x) => x < seuil });
  if (chiffres >= 3) { const q = Math.floor(n / 10); sortie.push({ texte: `J'ai ${fr(q)} dizaines en tout.`, vrai: (x) => Math.floor(x / 10) === q, direct: true }); }
  return melanger(alea, sortie);
}

/** Les chiffres des nombres d'une devinette, selon la classe. */
const chiffresDeLaDevinette = (c: Classe, alea: () => number) =>
  c === "CP" ? 2 : c === "CE1" ? 3 : c === "CE2" ? (alea() < 0.5 ? 3 : 4) : 4;

/** Une devinette : le nombre, ses indices — assez pour qu'il soit le seul —, et des nombres presque justes. */
export function devinette(alea: () => number, chiffres: number): { n: number; indices: Indice[]; presque: number[] } | null {
  const de = 10 ** (chiffres - 1), jusqua = 10 ** chiffres - 1;
  const n = entre(alea, de, jusqua);
  let candidats = Array.from({ length: jusqua - de + 1 }, (_, i) => de + i);
  const retenus: Indice[] = [];
  let directs = 0;
  for (const indice of indicesVrais(n, chiffres, alea)) {
    if (retenus.length >= (chiffres <= 2 ? 3 : 4) || candidats.length === 1) break;
    // Un seul indice qui donne un chiffre tout cru, sauf pour les grands nombres : sinon ce n'est plus une devinette.
    if (indice.direct && directs >= (chiffres >= 4 ? 2 : 1)) continue;
    const suite = candidats.filter(indice.vrai);
    if (suite.length === candidats.length) continue;
    retenus.push(indice);
    if (indice.direct) directs++;
    candidats = suite;
  }
  if (candidats.length !== 1) return null;
  // Un indice que les autres rendent inutile s'en va : la devinette dit ce qu'il faut, rien de plus.
  const tousLesNombres = Array.from({ length: jusqua - de + 1 }, (_, i) => de + i);
  const seul = (liste: Indice[]) => tousLesNombres.filter((x) => liste.every((r) => r.vrai(x))).length === 1;
  for (let i = retenus.length - 1; i >= 0 && retenus.length > 2; i--) {
    const sans = retenus.filter((_, k) => k !== i);
    if (seul(sans)) retenus.splice(i, 1);
  }
  if (retenus.length < 2) return null;
  // Les nombres qui satisfont tous les indices sauf un : les leurres qui font réfléchir.
  const presque = melanger(alea, tousLesNombres.filter((x) => x !== n && retenus.filter((r) => r.vrai(x)).length === retenus.length - 1));
  return { n, indices: retenus, presque };
}

const DEVINETTE: TypeDeCarte = {
  id: "devinette", nom: "Qui suis-je ? — devinettes de nombres", domaine: "Nombres", classes: classesDe("CP"), formats: ["tache", "pinces"],
  source: programmes(classesDe("CP")) + " : la valeur des chiffres, comparer, les nombres pairs et impairs",
  tirer(ctx) {
    const d = devinette(ctx.alea, chiffresDeLaDevinette(ctx.classe, ctx.alea));
    if (!d || d.presque.length < 2) return null;
    const lignes = [`J'ai ${String(d.n).length} chiffres.`, ...d.indices.map((i) => i.texte)];
    const visuel = `<div class="ct-devinette">${lignes.map((i) => `<div>${texte(i)}</div>`).join("")}</div>`;
    const p = ctx.format === "pinces" ? propositions(ctx.alea, fr(d.n), d.presque.map((x) => fr(x))) : sansChoix;
    return {
      question: "Qui suis-je ?", visuel, ...p, ligne: `Je suis ${BLANC}`, reponse: fr(d.n),
      etiquette: fr(d.n), leurres: d.presque.slice(0, 1).map((x) => fr(x)), cle: String(d.n),
    };
  },
};

// ── Le calcul mental ──────────────────────────────────────────────────────

/** Un nombre écrit à la française (« 1 234 », « 3,5 », « −2 »), ou rien. */
export function lireNombre(t: string): number | null {
  const propre = t.replace(/[\s  ]/g, "").replace("−", "-").replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(propre) ? Number(propre) : null;
}

/** Écrit un résultat comme la réponse juste l'écrit : autant de décimales. */
const commeLaReponse = (x: number, modele: string) => {
  const decimales = modele.includes(",") ? modele.split(",")[1].length : 0;
  return fr(x, decimales);
};

/** Les erreurs de calcul : ± 1, le voisin dans la table, l'autre opération. */
export function erreursDeCalcul(ecrit: string, reponse: number, alea: () => number): number[] {
  const m = /^\s*([\d\s ,]+)\s*([+−×÷-])\s*([\d\s ,]+)\s*=/.exec(ecrit);
  const sortie: number[] = [];
  if (m) {
    const a = lireNombre(m[1]), b = lireNombre(m[3]), op = m[2];
    if (a !== null && b !== null) {
      if (op === "×") sortie.push(a * (b + 1), a * (b - 1), (a + 1) * b, a + b);
      else if (op === "+") sortie.push(a + b + 10, a + b - 10, Math.abs(a - b));
      else if (op === "−" || op === "-") sortie.push(a + b, a - b + 10, a - b - 10);
      else if (op === "÷" && b !== 0) sortie.push(a / b + 1, a / b - 1, a - b);
    }
  }
  const ordre = Math.abs(reponse) >= 100 ? 10 : 1;
  sortie.push(...melanger(alea, [reponse + 1, reponse - 1]), reponse + ordre * 2, reponse - ordre * 2);
  return sortie.filter((x) => Number.isInteger(x * 1000));
}

const NIVEAUX_CALCUL: Record<Classe, Niveau | null> = { GS: null, CP: "CP", CE1: "CE1", CE2: "CE2", CM1: "CM1", CM2: "CM2" };

const CALCUL: TypeDeCarte = {
  id: "calcul", nom: "Calcul mental", domaine: "Calcul", classes: classesDe("CP"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CP")) + " : les faits numériques et les procédures de calcul mental, classe par classe",
  options: [{
    cle: "objectif", libelle: "Ce qu'on calcule",
    valeurs: (c) => [["tous", "Tout ce que la classe calcule"], ...objectifsDuNiveau(NIVEAUX_CALCUL[c] ?? "CP").map((o): [string, string] => [o.id, o.libelle])],
    defaut: () => "tous",
  }],
  tirer(ctx) {
    const niveau = NIVEAUX_CALCUL[ctx.classe];
    if (!niveau) return null;
    const objectifs = objectifsDuNiveau(niveau);
    const o = OBJECTIFS.find((x) => x.id === ctx.options.objectif && x.niveau === niveau) ?? parmi(ctx.alea, objectifs);
    const calcul = tirerCalcul(o, ctx.alea, o.tables ?? [2, 3, 4, 5, 6, 7, 8, 9]);
    const visuel = enGrand(texte(calcul.ecrit).replace("…", BLANC), "ct-nombre");
    const r = lireNombre(calcul.reponse);
    if (ctx.format === "pinces" && r === null) return null;
    const p = r === null ? sansChoix
      : propositions(ctx.alea, calcul.reponse, nombresFaux(r, erreursDeCalcul(calcul.ecrit, r, ctx.alea), r >= 0 ? 0 : -Infinity).map((x) => commeLaReponse(x, calcul.reponse)));
    return { question: "Calcule.", visuel, ...p, ligne: "", reponse: texte(calcul.reponse), cle: `${o.id}:${calcul.ecrit}` };
  },
};

// ── Les fractions ─────────────────────────────────────────────────────────

const FRACTION: TypeDeCarte = {
  id: "fraction", nom: "Quelle fraction est coloriée ?", domaine: "Nombres", classes: classesDe("CE1"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CE1")) + " : les fractions — un demi, un tiers, un quart au CE1",
  options: [{
    cle: "dessin", libelle: "Le dessin",
    valeurs: () => [["melange", "Des disques et des bandes"], ["disque", "Des disques"], ["bande", "Des bandes"]],
    defaut: () => "melange",
  }],
  tirer(ctx) {
    const a = ctx.alea;
    const ds = ctx.classe === "CE1" ? [2, 3, 4, 5, 6, 8, 10] : [2, 3, 4, 5, 6, 8, 10, 12];
    const d = parmi(a, ds);
    const k = ctx.classe === "CE1" && a() < 0.5 ? 1 : entre(a, 1, d - 1);
    const forme = ctx.options.dessin === "melange" ? parmi(a, ["disque", "bande"]) : ctx.options.dessin;
    const svg = forme === "disque" ? disqueSvg(k, d) : bandeSvg(k, d);
    // La part qui n'est pas coloriée, la part coloriée rapportée à l'autre, la fraction retournée, une part de trop.
    const candidats: [number, number][] = [[d - k, d], [k, d - k], [d, k], [k, d + 1], [k + 1, d]];
    const vu = new Set([k / d]);
    const faux: string[] = [];
    for (const [n, m] of candidats) {
      // Un dénominateur de 1 se lit comme un nombre entier, pas comme une fraction qu'on aurait pu choisir.
      if (n <= 0 || m <= 1 || vu.has(n / m)) continue;
      vu.add(n / m);
      faux.push(fractionHtml(n, m));
    }
    const p = propositions(a, fractionHtml(k, d), faux);
    return {
      question: "Quelle fraction est coloriée ?", visuel: dessin(svg), ...p,
      reponse: fractionHtml(k, d), cle: `${forme}:${k}/${d}`,
    };
  },
};

// ── Les nombres décimaux ──────────────────────────────────────────────────

const unites = (n: number, sing: string, plur: string) => `${fr(n)} ${n > 1 ? plur : sing}`;

const DECIMAL: TypeDeCarte = {
  id: "decimal", nom: "Les nombres décimaux : dixièmes, centièmes", domaine: "Nombres", classes: ["CM1", "CM2"], formats: ["pinces", "tache"],
  source: PROGRAMME_C3 + " : les fractions décimales et l'écriture à virgule",
  tirer(ctx) {
    const a = ctx.alea;
    const e = entre(a, 1, 19);
    const t = entre(a, 1, 9), h = entre(a, 1, 9);
    const forme = parmi(a, ctx.classe === "CM1" ? ["ud", "uc", "nd", "frac"] : ["ud", "uc", "nd", "nc", "frac"]);
    // Les valeurs en millièmes : 5,2 vaut 5 200, 5,02 vaut 5 020.
    let enonce: string, juste: number, faux: number[];
    switch (forme) {
      case "ud": enonce = texte(`${unites(e, "unité", "unités")} et ${unites(t, "dixième", "dixièmes")}`); juste = e * 1000 + t * 100;
        faux = [e * 1000 + t * 10, (e * 10 + t) * 1000, (e * 10 + t) * 10]; break;
      case "uc": enonce = texte(`${unites(e, "unité", "unités")} et ${unites(h, "centième", "centièmes")}`); juste = e * 1000 + h * 10;
        faux = [e * 1000 + h * 100, e * 1000 + h, (e * 10 + h) * 1000]; break;
      case "nd": { const n = e * 10 + t; enonce = texte(unites(n, "dixième", "dixièmes")); juste = n * 100; faux = [n * 1000, n * 10, n * 10000]; break; }
      case "nc": { const n = e * 100 + t * 10 + h; enonce = texte(unites(n, "centième", "centièmes")); juste = n * 10; faux = [n * 100, n, n * 1000]; break; }
      default: enonce = `${fr(e)} + ${fractionHtml(t, 10)} + ${fractionHtml(h, 100)}`; juste = e * 1000 + t * 100 + h * 10;
        faux = [e * 1000 + h * 100 + t * 10, e * 1000 + t * 10 + h, (e * 100 + t * 10 + h) * 1000];
    }
    const ecrire = (x: number) => virgule(x, 1000);
    const p = propositions(a, ecrire(juste), nombresFaux(juste, faux, 1).map(ecrire));
    return {
      question: "Quel est ce nombre ?", visuel: enGrand(enonce, "ct-texte-moyen"), ...p, reponse: ecrire(juste), cle: `${forme}:${juste}`,
    };
  },
};

// ── Les petits problèmes ──────────────────────────────────────────────────

/** Les nombres d'un calcul écrit : « 12 + 7 = 19 » donne 12, 7 et 19. */
const nombresDuCalcul = (calcul: string) => (calcul.match(/\d[\d\s  ]*/g) ?? []).map((t) => Number(t.replace(/\D/g, "")));

const PROBLEME: TypeDeCarte = {
  id: "probleme", nom: "Un petit problème", domaine: "Calcul", classes: classesDe("CP"), formats: ["tache", "pinces"],
  source: programmes(classesDe("CP")) + " : résoudre des problèmes en une étape — parties et tout, parts égales",
  options: [{
    cle: "sorte", libelle: "Les problèmes",
    valeurs: (c) => c === "CP" ? [["additifs", "Parties et tout (additions, soustractions)"]]
      : [["melange", "Additifs et multiplicatifs, mêlés"], ["additifs", "Parties et tout (additions, soustractions)"], ["multiplicatifs", "Parts égales (multiplications, divisions)"]],
    defaut: (c) => (c === "CP" ? "additifs" : "melange"),
  }],
  tirer(ctx) {
    const a = ctx.alea;
    const graine = Math.floor(a() * 1e9);
    const sorte = ctx.classe === "CP" ? "additifs" : ctx.options.sorte === "melange" ? parmi(a, ["additifs", "multiplicatifs"]) : ctx.options.sorte;
    const max = ctx.classe === "CP" ? 20 : ctx.classe === "CE1" ? 100 : ctx.classe === "CE2" ? 1000 : 10000;
    const types: TypeMultiplicatif[] = ctx.classe === "CE1" ? ["tout", "part", "nombre"] : ["tout", "part", "nombre", "grand", "petit"];
    const pb = sorte === "additifs"
      ? problemePartieTout({ nombre: 1, parties: 2, inconnue: "melange", max, enonces: true, prenoms: [] }, graine, entre(a, 0, 1))
      : problemeMultiplicatif({ nombre: 1, types, table: ctx.classe === "CE1" ? 5 : 10, enonces: true, prenoms: [] }, graine, 0);
    if (!pb.enonce) return null;
    const [x = 0, y = 0] = nombresDuCalcul(pb.calcul);
    const r = pb.reponse;
    // L'erreur qu'on fait le plus : l'autre opération — l'addition pour la soustraction, et inversement ; dans
    // un partage, l'addition ou la soustraction des deux nombres. Un produit n'a rien à faire parmi les additions.
    const autres = sorte === "additifs" ? [x + y, Math.abs(x - y)] : [x + y, Math.abs(x - y), x * y, y !== 0 && x % y === 0 ? x / y : NaN];
    const faux = nombresFaux(r, [...autres, r + 1, r - 1, r + 10, r - 10], 0);
    const p = ctx.format === "pinces" ? propositions(a, fr(r), faux.map((v) => fr(v))) : sansChoix;
    return {
      question: "Résous le problème.", visuel: `<div class="ct-enonce">${texte(pb.enonce)}</div>`, ...p,
      ligne: `Réponse : ${BLANC}`, reponse: `${fr(r)}${pb.phrase ? ` — ${texte(pb.phrase)}` : ""}`, cle: pb.enonce,
    };
  },
};

// ── L'heure ───────────────────────────────────────────────────────────────

const PRECISION_DE_LA_CLASSE: Record<Classe, PrecisionHeure> = { GS: "heures", CP: "demies", CE1: "quarts", CE2: "cinq", CM1: "minutes", CM2: "minutes" };

/** Les erreurs de lecture : l'heure d'après quand la petite aiguille a dépassé le nombre, le nombre lu comme des minutes, les aiguilles confondues. */
export function erreursDHeure(t: Heure): Heure[] {
  const sortie: Heure[] = [];
  const suivante = (h: number) => (h % 12) + 1;
  if (t.m >= 30) sortie.push({ h: suivante(t.h), m: t.m });
  if (t.m > 0 && t.m % 5 === 0) sortie.push({ h: t.h, m: t.m / 5 });
  sortie.push({ h: t.m === 0 ? 12 : t.m / 5 >= 1 && t.m % 5 === 0 ? t.m / 5 : suivante(t.h), m: (t.h % 12) * 5 });
  sortie.push({ h: suivante(t.h), m: t.m }, { h: t.h === 1 ? 12 : t.h - 1, m: t.m });
  return sortie.filter((x) => Number.isInteger(x.h) && x.h >= 1 && x.h <= 12 && x.m >= 0 && x.m < 60);
}

const HEURE: TypeDeCarte = {
  id: "heure", nom: "Quelle heure est-il ?", domaine: "Grandeurs et mesures", classes: classesDe("CP"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CP")) + " : lire l'heure sur une horloge à aiguilles",
  options: [{
    cle: "precision", libelle: "Les heures",
    valeurs: () => PRECISIONS_HEURE.map((p): [string, string] => [p.id, p.libelle]),
    defaut: (c) => PRECISION_DE_LA_CLASSE[c],
  }],
  tirer(ctx) {
    const precision = (ctx.options.precision as PrecisionHeure) in PAS_MINUTES ? ctx.options.precision as PrecisionHeure : PRECISION_DE_LA_CLASSE[ctx.classe];
    const pas = PAS_MINUTES[precision];
    const t: Heure = { h: entre(ctx.alea, 1, 12), m: pas * entre(ctx.alea, 0, 60 / pas - 1) };
    const p = propositions(ctx.alea, lireHeure(t), erreursDHeure(t).map(lireHeure));
    return {
      question: "Quelle heure est-il ?", visuel: dessin(horlogeSvg(t, { mm: 40 })), ...p,
      ligne: `Il est ${BLANC} h ${BLANC}`, reponse: lireHeure(t), cle: lireHeure(t),
    };
  },
};

// ── La monnaie ────────────────────────────────────────────────────────────

const MONNAIE: TypeDeCarte = {
  id: "monnaie", nom: "Combien d'argent ?", domaine: "Grandeurs et mesures", classes: classesDe("CP"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CP")) + " : la valeur d'un ensemble de pièces et de billets",
  options: [{
    cle: "centimes", libelle: "Les pièces",
    valeurs: () => [["non", "Des euros seulement"], ["oui", "Avec les centimes"]],
    defaut: (c) => (rang(c) >= rang("CE2") ? "oui" : "non"),
  }],
  tirer(ctx) {
    const centimes = ctx.options.centimes === "oui";
    const virgule = centimes && rang(ctx.classe) >= rang("CE2");
    const jusqua = ctx.classe === "CP" ? 20 : ctx.classe === "CE1" ? 50 : 100;
    const especes = porteMonnaie({ ...REGLAGES_MONNAIE, jusqua, centimes, virgule }, ctx.alea);
    const total = especes.reduce((s, v) => s + v, 0);
    const autres = [...new Set(especes)];
    // Une pièce oubliée, une pièce comptée deux fois, les objets comptés au lieu de leur valeur.
    const faux = [...melanger(ctx.alea, autres.map((v) => total - v)), ...melanger(ctx.alea, autres.map((v) => total + v)), centimes ? NaN : especes.length * 100];
    const p = propositions(ctx.alea, montant(total, virgule), nombresFaux(total, faux, 1).map((v) => montant(v, virgule)));
    const objets = [...especes].sort((x, y) => y - x).map((v) => (v >= 500 ? billetSvg(v, 0.2) : pieceSvg(v, 0.56))).join("");
    return {
      question: "Combien d'argent ?", visuel: `<div class="ct-objets">${objets}</div>`, ...p,
      ligne: `Il y a ${BLANC}`, reponse: montant(total, virgule), cle: [...especes].sort((x, y) => x - y).join("+"),
    };
  },
};

// ── Quelle unité ? ────────────────────────────────────────────────────────

const UNITE: TypeDeCarte = {
  id: "unite", nom: "Quelle unité ? Ordres de grandeur", domaine: "Grandeurs et mesures", classes: classesDe("CP"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CP")) + " : des grandeurs de référence ; Éduscol, « Estimations — Masses »",
  options: [{
    cle: "grandeur", libelle: "La grandeur",
    valeurs: (c) => [["toutes", "Longueurs, masses, contenances"], ["longueur", "Les longueurs"], ...(rang(c) >= rang("CE1") ? [["masse", "Les masses"]] as [string, string][] : []),
      ...(rang(c) >= rang("CE2") ? [["contenance", "Les contenances"]] as [string, string][] : [])],
    defaut: () => "toutes",
  }],
  tirer(ctx) {
    const classe = auPlusCE2(ctx.classe);
    const grandeurs: Grandeur[] = ctx.options.grandeur === "toutes" ? ["longueur", "masse", "contenance"] : [ctx.options.grandeur as Grandeur];
    const refs = grandeurs.flatMap((g) => referencesPour(g, classe));
    if (!refs.length) return null;
    const r = ctx.pioche(`unite:${grandeurs.join()}:${classe}`, refs);
    const juste = r.options[r.juste];
    if (ctx.format === "pinces") {
      return {
        question: "Quelle est la bonne mesure ?", visuel: enGrand(`${texte(r.phrase)} …`, "ct-texte-moyen"), ...dansLOrdre(r.options, juste),
        reponse: texte(`${r.phrase} ${juste}.`), cle: r.phrase,
      };
    }
    const [nombre, unite] = [juste.replace(/\s*\S+$/, ""), juste.replace(/^.*\s/, "")];
    return {
      question: "Complète avec la bonne unité.", visuel: enGrand(`${texte(r.phrase)} ${texte(nombre)} ${BLANC}`, "ct-texte-moyen"), ...sansChoix,
      ligne: `<span class="ct-aide">${unitesConnues(r.grandeur, classe).join(" · ")}</span>`, reponse: texte(unite), cle: r.phrase,
    };
  },
};

// ── Mesurer un segment ────────────────────────────────────────────────────

const enCmMm = (mm: number) => (mm % 10 ? `${Math.floor(mm / 10)} cm ${mm % 10} mm` : `${mm / 10} cm`);

const LONGUEUR: TypeDeCarte = {
  id: "longueur", nom: "Mesure ce segment", domaine: "Grandeurs et mesures", classes: classesDe("CP"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CP")) + " : mesurer des longueurs avec la règle graduée",
  note: "Imprimez à 100 %, sans ajuster à la page : les segments sont à leur taille réelle.",
  tirer(ctx) {
    const a = ctx.alea;
    const auMm = rang(ctx.classe) >= rang("CE2");
    const cm = entre(a, 2, ctx.format === "pinces" ? 5 : 7);
    const mm = auMm && a() < 0.8 ? cm * 10 + entre(a, 1, 9) : cm * 10;
    // Penché, un segment tient sur une petite carte ; il ne se réduit jamais : il doit garder sa taille réelle.
    const angle = parmi(a, [0, 0, 15, -15, 30, -30, 45, -45]);
    const t = (angle * Math.PI) / 180;
    if (mm * Math.abs(Math.cos(t)) + 8 > ctx.place.l || mm * Math.abs(Math.sin(t)) + 8 > ctx.place.h) return null;
    const r = mm % 10, c = Math.floor(mm / 10);
    const faux = auMm && r ? [c * 10 + r + 1, c * 10 + r - 1, (c + 1) * 10 + r, r * 10 + c, mm + 10] : [mm + 10, mm - 10, mm + 20];
    const p = propositions(a, enCmMm(mm), nombresFaux(mm, faux, 5).map(enCmMm));
    return {
      question: "Combien mesure ce segment ?", visuel: aTailleReelle(segmentSvg(mm, angle)), ...p,
      ligne: auMm ? `${BLANC} cm ${BLANC} mm` : `${BLANC} cm`, reponse: enCmMm(mm), cle: `${mm}:${angle}`,
    };
  },
};

// ── L'aire et le périmètre, sur quadrillage ───────────────────────────────

/** Une figure faite de carreaux : un rectangle, ou un rectangle entaillé — en L, en U, en escalier. */
export function figureEnCarreaux(alea: () => number, rectangles = false): Set<string> {
  const l = entre(alea, 3, 8), h = entre(alea, 2, 5);
  const cases = new Set<string>();
  for (let x = 0; x < l; x++) for (let y = 0; y < h; y++) cases.add(`${x},${y}`);
  if (!rectangles && l >= 4 && h >= 3) {
    const forme = parmi(alea, ["L", "U", "escalier"]);
    const ote = (x0: number, y0: number, lx: number, ly: number) => { for (let x = x0; x < x0 + lx; x++) for (let y = y0; y < y0 + ly; y++) cases.delete(`${x},${y}`); };
    if (forme === "L") ote(l - entre(alea, 1, l - 2), 0, l, entre(alea, 1, h - 1));
    else if (forme === "U") ote(entre(alea, 1, Math.max(1, l - 3)), 0, entre(alea, 1, Math.max(1, l - 3)), entre(alea, 1, h - 1));
    else for (let k = 1; k < Math.min(l, h); k++) ote(l - k, 0, k, h - k);
  }
  return cases;
}

/** L'aire en carreaux, le périmètre en côtés de carreau. */
export function aireEtPerimetre(cases: Set<string>): { aire: number; perimetre: number } {
  let perimetre = 0;
  for (const c of cases) {
    const [x, y] = c.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!cases.has(`${x + dx},${y + dy}`)) perimetre++;
  }
  return { aire: cases.size, perimetre };
}

/** La figure sur son quadrillage ; dessous, hors de la grille, l'unité à la taille d'un carreau. */
function quadrillageSvg(cases: Set<string>, unite: string, perimetre: boolean): string {
  const pts = [...cases].map((c) => c.split(",").map(Number));
  const l = Math.max(...pts.map((p) => p[0])) + 1, h = Math.max(...pts.map((p) => p[1])) + 1;
  const cols = l + 2, lignes = h + 2, u = 10;
  const grille = [
    ...Array.from({ length: cols + 1 }, (_, i) => `<line x1="${i * u}" y1="0" x2="${i * u}" y2="${lignes * u}" stroke="#c4c9d6" stroke-width="0.6"/>`),
    ...Array.from({ length: lignes + 1 }, (_, j) => `<line x1="0" y1="${j * u}" x2="${cols * u}" y2="${j * u}" stroke="#c4c9d6" stroke-width="0.6"/>`),
  ].join("");
  const carreaux = pts.map(([x, y]) => `<rect x="${(x + 1) * u}" y="${(y + 1) * u}" width="${u}" height="${u}" fill="#9ec5e8"/>`).join("");
  // Le bord de la figure : les côtés de carreau qui n'ont pas de voisin.
  const bords: string[] = [];
  for (const [x, y] of pts) {
    const X = (x + 1) * u, Y = (y + 1) * u;
    if (!cases.has(`${x},${y - 1}`)) bords.push(`M${X} ${Y} H${X + u}`);
    if (!cases.has(`${x},${y + 1}`)) bords.push(`M${X} ${Y + u} H${X + u}`);
    if (!cases.has(`${x - 1},${y}`)) bords.push(`M${X} ${Y} V${Y + u}`);
    if (!cases.has(`${x + 1},${y}`)) bords.push(`M${X + u} ${Y} V${Y + u}`);
  }
  const yL = lignes * u + 4;
  const texteUnite = `<text x="${u + u + 3}" y="${yL + u / 2 + 2.2}" font-size="6.5" font-weight="700" font-family="Helvetica, Arial, sans-serif" fill="${NOIR}">= ${unite}</text>`;
  const legende = perimetre
    ? `<line x1="${u}" y1="${yL + u / 2}" x2="${2 * u}" y2="${yL + u / 2}" stroke="${ROUGE}" stroke-width="1.8"/>${texteUnite}`
    : `<rect x="${u}" y="${yL}" width="${u}" height="${u}" fill="#fff" stroke="${NOIR}" stroke-width="1"/>${texteUnite}`;
  return `<svg viewBox="-1 -1 ${cols * u + 2} ${yL + u + 2}" xmlns="http://www.w3.org/2000/svg">${grille}${carreaux}<path d="${bords.join(" ")}" stroke="${NOIR}" stroke-width="1.6" stroke-linecap="round" fill="none"/>${legende}</svg>`;
}

const LIEUX_AIRE = ["cette chambre", "ce salon", "ce jardin", "ce potager", "cette cour", "ce tapis", "cette terrasse", "ce parking"];
const LIEUX_PERIMETRE = ["ce jardin", "ce champ", "ce potager", "cette cour", "ce parc", "cet enclos", "cette piscine", "ce terrain"];

function carteAireOuPerimetre(ctx: Contexte, perimetre: boolean): Carte | null {
  const a = ctx.alea;
  const cases = figureEnCarreaux(a, ctx.options.formes === "rectangles");
  const { aire, perimetre: p } = aireEtPerimetre(cases);
  if (aire === p) return null;
  const abstrait = ctx.options.unite === "u";
  const lieu = abstrait ? "cette figure" : parmi(a, perimetre ? LIEUX_PERIMETRE : LIEUX_AIRE);
  const unite = abstrait ? "1 u" : perimetre ? "1 m" : "1 m²";
  const u = abstrait ? "u" : perimetre ? "m" : "m²";
  const juste = perimetre ? p : aire;
  const autre = perimetre ? aire : p;
  const pts = [...cases].map((c) => c.split(",").map(Number));
  const l = Math.max(...pts.map((q) => q[0])) + 1, h = Math.max(...pts.map((q) => q[1])) + 1;
  // L'aire prise pour le périmètre (et l'inverse) ; la longueur et la largeur ajoutées ; un carreau de trop.
  const faux = nombresFaux(juste, [autre, perimetre ? l + h : 2 * (l + h), juste + 1, juste - 1, juste + 2], 1);
  const pr = propositions(a, `${juste} ${u}`, faux.map((x) => `${x} ${u}`));
  return {
    question: perimetre ? `Quel est le périmètre de ${lieu} ?` : `Quelle est l'aire de ${lieu} ?`,
    visuel: dessin(quadrillageSvg(cases, unite, perimetre)), ...pr,
    ligne: `${perimetre ? "P" : "A"} = ${BLANC} ${u}`, reponse: `${juste} ${u}`, cle: [...cases].sort().join(";"),
  };
}

const OPTIONS_QUADRILLAGE = [
  { cle: "formes", libelle: "Les figures", valeurs: (): [string, string][] => [["toutes", "Des rectangles et des figures en L, en U, en escalier"], ["rectangles", "Des rectangles seulement"]], defaut: () => "toutes" },
  { cle: "unite", libelle: "L'unité", valeurs: (): [string, string][] => [["m", "En mètres : une chambre, un jardin…"], ["u", "Une unité « u », sans contexte"]], defaut: () => "m" },
];

const AIRE: TypeDeCarte = {
  id: "aire", nom: "L'aire, sur quadrillage", domaine: "Grandeurs et mesures", classes: ["CM1", "CM2"], formats: ["pinces", "tache"],
  source: PROGRAMME_C3 + " : mesurer une aire en comptant des unités, la distinguer du périmètre",
  options: OPTIONS_QUADRILLAGE, tirer: (ctx) => carteAireOuPerimetre(ctx, false),
};

const PERIMETRE: TypeDeCarte = {
  id: "perimetre", nom: "Le périmètre, sur quadrillage", domaine: "Grandeurs et mesures", classes: classesDe("CE2"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CE2")) + " : le périmètre d'un polygone, en reportant une unité",
  options: OPTIONS_QUADRILLAGE, tirer: (ctx) => carteAireOuPerimetre(ctx, true),
};

// ── Les durées ────────────────────────────────────────────────────────────

const DUREE: TypeDeCarte = {
  id: "duree", nom: "Combien de temps ?", domaine: "Grandeurs et mesures", classes: classesDe("CE2"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CE2")) + " : calculer une durée à partir de deux horaires",
  tirer(ctx) {
    const precision: PrecisionHeure = ctx.classe === "CE2" ? "quarts" : "cinq";
    const [d] = durees({ precision, combien: 1, apresMidi: false }, Math.floor(ctx.alea() * 1e9));
    if (!d) return null;
    const faux = nombresFaux(d.minutes, [d.minutes + 60, d.minutes - 60, d.minutes + 15, d.minutes - 15, d.minutes + 5, d.minutes - 5], 5);
    const p = propositions(ctx.alea, ecrireDuree(d.minutes), faux.map(ecrireDuree));
    const cadran = (t: Heure) => horlogeSvg(t, { mm: 30 });
    const quoi = d.quoi.charAt(0).toLowerCase() + d.quoi.slice(1);
    return {
      question: `Combien de temps dure ${quoi} ?`,
      visuel: `<div class="ct-deux"><div><span>début</span>${dessin(cadran(d.debut))}</div><b>→</b><div><span>fin</span>${dessin(cadran(d.fin))}</div></div>`,
      ...p, ligne: `${BLANC} h ${BLANC} min`, reponse: ecrireDuree(d.minutes), cle: `${d.quoi}:${lireHeure(d.debut)}:${d.minutes}`,
    };
  },
};

// ── Convertir ─────────────────────────────────────────────────────────────

const CONVERSION: TypeDeCarte = {
  id: "conversion", nom: "Les unités : convertir", domaine: "Grandeurs et mesures", classes: classesDe("CE2"), formats: ["tache", "pinces"],
  source: programmes(classesDe("CE2")) + " : les relations entre les unités, sans tableau de conversion au cycle 2",
  options: [{
    cle: "grandeur", libelle: "La grandeur",
    valeurs: () => [["toutes", "Longueurs, masses, contenances"], ["longueur", "Les longueurs"], ["masse", "Les masses"], ["contenance", "Les contenances"]],
    defaut: () => "toutes",
  }],
  tirer(ctx) {
    const g: Grandeur = ctx.options.grandeur === "toutes" ? parmi(ctx.alea, ["longueur", "masse", "contenance"] as Grandeur[]) : ctx.options.grandeur as Grandeur;
    const [c] = conversions(g, "CE2", 1, Math.floor(ctx.alea() * 1e9));
    if (!c) return null;
    const enonce = c.enonce.split(`<span class="me-blanc"></span>`).join(BLANC);
    const seul = c.reponses.length === 1 ? lireNombre(c.reponses[0]) : null;
    if (ctx.format === "pinces" && seul === null) return null;
    const p = seul === null ? sansChoix : propositions(ctx.alea, fr(seul), nombresFaux(seul, [seul * 10, seul / 10, seul * 100, seul / 100], 0).filter(Number.isInteger).map((x) => fr(x)));
    let i = 0;
    const rempli = c.enonce.split(`<span class="me-blanc"></span>`).map((m, k) => (k ? `<b>${c.reponses[i++] ?? ""}</b>` : "") + m).join("");
    return { question: "Complète.", visuel: enGrand(enonce, c.reponses.length > 1 ? "ct-nombre ct-texte-moyen" : "ct-nombre"), ...p, ligne: "", reponse: rempli, cle: c.enonce };
  },
};

// ── Les solides ───────────────────────────────────────────────────────────

/** Les solides qu'on confond avec chacun, les plus proches d'abord. */
const CONFUSIONS_SOLIDES: Record<string, string[]> = {
  "cube": ["pavé", "pyramide", "cylindre", "boule"], "pavé": ["cube", "pyramide", "cylindre", "cône"], "boule": ["cylindre", "cône", "cube"],
  "cylindre": ["cône", "pavé", "boule", "cube"], "cône": ["pyramide", "cylindre", "boule"], "pyramide": ["cône", "cube", "pavé"],
};

const solidesDe = (c: Classe): Solide[] => SOLIDES_DE_LA_CLASSE[auPlusCE2(c)];

const SOLIDE: TypeDeCarte = {
  id: "solide", nom: "Quel est ce solide ?", domaine: "Espace et géométrie", classes: classesDe("CP"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CP")) + " : reconnaître et nommer le cube, le pavé, la boule, le cylindre, le cône, la pyramide",
  options: [{
    cle: "cachees", libelle: "Les arêtes cachées",
    valeurs: () => [["non", "Sans les arêtes cachées"], ["oui", "En pointillés (à partir du CE2)"]],
    defaut: (c) => (rang(c) >= rang("CE2") ? "oui" : "non"),
  }],
  tirer(ctx) {
    const liste = solidesDe(ctx.classe);
    const s = ctx.pioche(`solide:${ctx.classe}`, liste);
    const dims = dimensionsAuHasard(ctx.alea, s);
    const nom = nomASavoir(s);
    const connus = new Set<string>(liste.map(nomASavoir));
    const p = propositions(ctx.alea, nom, (CONFUSIONS_SOLIDES[nom] ?? []).filter((x) => connus.has(x)));
    return {
      question: "Quel est ce solide ?", visuel: dessin(solideSvg(s, dims, ctx.options.cachees === "oui")), ...p,
      reponse: nom, cle: `${s}:${dims.join("x")}`,
    };
  },
};

const ELEMENTS: Record<string, { faces: number; sommets: number; aretes: number }> = {
  "cube": { faces: 6, sommets: 8, aretes: 12 }, "pavé": { faces: 6, sommets: 8, aretes: 12 },
  "pyramide": { faces: 5, sommets: 5, aretes: 8 }, "pyramide à base triangulaire": { faces: 4, sommets: 4, aretes: 6 },
};

const FACES: TypeDeCarte = {
  id: "faces", nom: "Faces, sommets, arêtes", domaine: "Espace et géométrie", classes: classesDe("CE1"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CE1")) + " : décrire un solide — ses faces, ses sommets, ses arêtes",
  options: [{
    cle: "quoi", libelle: "Ce qu'on compte",
    valeurs: () => [["melange", "Faces, sommets et arêtes, mêlés"], ["faces", "Les faces"], ["sommets", "Les sommets"], ["aretes", "Les arêtes"]],
    defaut: () => "melange",
  }],
  tirer(ctx) {
    const a = ctx.alea;
    const solides = (["cube", "pavé", "pyramide", "pyramide à base triangulaire"] as Solide[]).filter((s) => solidesDe(ctx.classe).includes(s));
    const s = parmi(a, solides);
    const quoi = (ctx.options.quoi === "melange" ? parmi(a, ["faces", "sommets", "aretes"]) : ctx.options.quoi) as "faces" | "sommets" | "aretes";
    const e = ELEMENTS[s];
    const juste = e[quoi];
    const p = propositions(a, String(juste), nombresFaux(juste, [e.faces, e.sommets, e.aretes, juste + 1, juste - 1, juste + 2], 1).map(String));
    const mot = quoi === "aretes" ? "arêtes" : quoi;
    return {
      question: `Combien ce solide a-t-il de ${mot} ?`, visuel: dessin(solideSvg(s, dimensionsAuHasard(a, s), true)), ...p,
      ligne: `${BLANC} ${mot}`, reponse: `${juste} ${mot}`, cle: `${s}:${quoi}:${juste}:${entre(a, 0, 3)}`,
    };
  },
};

// ── Les figures planes ────────────────────────────────────────────────────

/**
 * Les noms faux qu'on peut proposer pour une figure : jamais un nom qui lui
 * va aussi — un carré est aussi un rectangle, un losange, un quadrilatère ;
 * un triangle rectangle est aussi un triangle.
 */
const CONFUSIONS_FIGURES: Record<NomFigure, NomFigure[]> = {
  "carré": ["triangle", "disque", "pentagone", "hexagone", "triangle rectangle"],
  "rectangle": ["carré", "losange", "triangle", "hexagone", "pentagone"],
  "triangle": ["triangle rectangle", "carré", "rectangle", "disque", "pentagone"],
  "triangle rectangle": ["carré", "rectangle", "losange", "pentagone"],
  "disque": ["carré", "triangle", "hexagone", "pentagone", "rectangle"],
  "losange": ["carré", "rectangle", "triangle", "hexagone"],
  "quadrilatère": ["carré", "rectangle", "losange", "triangle"],
  "pentagone": ["hexagone", "triangle", "carré", "disque"],
  "hexagone": ["pentagone", "carré", "disque", "triangle"],
};

/** Les angles d'un polygone, en degrés. */
export function anglesDe(sommets: P[]): number[] {
  return sommets.map((s, i) => {
    const a = sommets[(i + sommets.length - 1) % sommets.length], b = sommets[(i + 1) % sommets.length];
    const u = [a[0] - s[0], a[1] - s[1]], v = [b[0] - s[0], b[1] - s[1]];
    const c = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]));
    return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  });
}

const polygone = (pts: P[]) => `<path d="M${pts.map((p) => `${f2(p[0] + 20)} ${f2(p[1] + 20)}`).join(" L")} Z" fill="rgba(36,84,230,0.10)" stroke="${NOIR}" stroke-width="0.6" stroke-linejoin="round"/>`;

const FIGURE: TypeDeCarte = {
  id: "figure", nom: "Quelle est cette figure ?", domaine: "Espace et géométrie", classes: classesDe("CP"), formats: ["pinces", "tache"],
  source: programmes(classesDe("CP")) + " : reconnaître et nommer les figures usuelles",
  tirer(ctx) {
    const noms = FIGURES_DE_LA_CLASSE[auPlusCE2(ctx.classe)];
    const nom = ctx.pioche(`figure:${ctx.classe}`, noms);
    const f = figureAuHasard(ctx.alea, nom);
    // Un triangle quelconque n'a pas d'angle presque droit : on le prendrait pour un triangle rectangle.
    if (nom === "triangle" && anglesDe(f.sommets).some((x) => x > 78 && x < 102)) return null;
    const svg = `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">${f.rayon ? `<circle cx="20" cy="20" r="${f.rayon}" fill="rgba(36,84,230,0.10)" stroke="${NOIR}" stroke-width="0.6"/>` : polygone(f.sommets)}</svg>`;
    const p = propositions(ctx.alea, nom, CONFUSIONS_FIGURES[nom].filter((x) => noms.includes(x)));
    return { question: "Quelle est cette figure ?", visuel: dessin(svg), ...p, reponse: nom, cle: `${nom}:${f.sommets.map((q) => q.map(Math.round).join(",")).join(";")}${f.rayon ?? ""}` };
  },
};

// ── Les angles ────────────────────────────────────────────────────────────

const ANGLE: TypeDeCarte = {
  id: "angle", nom: "L'angle droit — aigu, obtus", domaine: "Espace et géométrie", classes: classesDe("CE1"), formats: ["pinces"],
  source: programmes(classesDe("CE1")) + " : reconnaître un angle droit avec l'équerre ; au cycle 3, aigu et obtus",
  tirer(ctx) {
    const a = ctx.alea;
    const cycle3 = rang(ctx.classe) >= rang("CM1");
    const sorte = parmi(a, cycle3 ? ["droit", "aigu", "obtus"] : ["droit", "droit", "aigu", "obtus"]);
    const mesure = sorte === "droit" ? 90 : sorte === "aigu" ? parmi(a, [30, 40, 50, 60]) : parmi(a, [120, 130, 140, 150]);
    const depart = entre(a, 0, 23) * 15;
    const d = (depart * Math.PI) / 180, e = ((depart + mesure) * Math.PI) / 180;
    const s: P = [20, 20];
    const bout = (t: number): P => [s[0] + Math.cos(t) * 17, s[1] - Math.sin(t) * 17];
    const svg = `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M${f2(bout(d)[0])} ${f2(bout(d)[1])} L20 20 L${f2(bout(e)[0])} ${f2(bout(e)[1])}" fill="none" stroke="${NOIR}" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="20" r="0.9" fill="${NOIR}"/></svg>`;
    if (cycle3) return { question: "Cet angle est…", visuel: dessin(svg), ...dansLOrdre(["droit", "aigu", "obtus"], sorte), reponse: sorte, cle: `${mesure}:${depart}` };
    const juste = sorte === "droit" ? "oui" : "non";
    return { question: "Est-ce un angle droit ?", visuel: dessin(svg), ...dansLOrdre(["oui", "non"], juste), reponse: juste === "oui" ? "oui, c'est un angle droit" : "non", cle: `${mesure}:${depart}` };
  },
};

// ── Les axes de symétrie ──────────────────────────────────────────────────

const angleDe = ([a, b]: [P, P]) => ((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI + 180) % 180;

/** Une droite qui traverse la case de 40 mm, passant par `c` avec l'angle donné (en degrés). */
function droiteParLeCentre(c: P, angle: number): [P, P] {
  const t = (angle * Math.PI) / 180;
  return [[c[0] - Math.cos(t) * 24, c[1] - Math.sin(t) * 24], [c[0] + Math.cos(t) * 24, c[1] + Math.sin(t) * 24]];
}

const SYMETRIE: TypeDeCarte = {
  id: "symetrie", nom: "Est-ce un axe de symétrie ?", domaine: "Espace et géométrie", classes: classesDe("CE2"), formats: ["pinces"],
  source: programmes(classesDe("CE2")) + " : reconnaître un axe de symétrie, par pliage ou au calque",
  tirer(ctx) {
    const a = ctx.alea;
    const f = parmi(a, FIGURES_AXES);
    const oui = f.axes.length > 0 && a() < 0.5;
    let droite: [P, P];
    if (oui) droite = parmi(a, f.axes);
    else {
      const pris = f.axes.map(angleDe);
      const libres = [0, 30, 45, 60, 90, 120, 135, 150].filter((x) => pris.every((y) => Math.min(Math.abs(x - y), 180 - Math.abs(x - y)) > 5));
      droite = droiteParLeCentre([20, 20], parmi(a, libres));
    }
    const svg = `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">${f.dessin}`
      + `<line x1="${f2(droite[0][0])}" y1="${f2(droite[0][1])}" x2="${f2(droite[1][0])}" y2="${f2(droite[1][1])}" stroke="${ROUGE}" stroke-width="0.7" stroke-dasharray="2.4 1.6"/></svg>`;
    const juste = oui ? "oui" : "non";
    return {
      question: "La droite rouge est-elle un axe de symétrie ?", visuel: dessin(svg), ...dansLOrdre(["oui", "non"], juste),
      reponse: oui ? "oui" : "non", cle: `${f.nom}:${droite.flat().map(Math.round).join(",")}`,
    };
  },
};

// ── Se repérer sur un quadrillage ─────────────────────────────────────────

const ETOILE = (cx: number, cy: number, r: number) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const t = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r;
    return `${f2(cx + rr * Math.cos(t))},${f2(cy + rr * Math.sin(t))}`;
  });
  return `<polygon points="${pts.join(" ")}" fill="#f2b632" stroke="${NOIR}" stroke-width="0.5" stroke-linejoin="round"/>`;
};

const CASE: TypeDeCarte = {
  id: "case", nom: "Dans quelle case ?", domaine: "Espace et géométrie", classes: classesDe("GS", "CE2"), formats: ["pinces", "tache"],
  source: "Programme de l'école maternelle (2021) et " + PROGRAMME_C2 + " : se repérer dans un quadrillage, coder une case",
  tirer(ctx) {
    const a = ctx.alea;
    const n = ctx.classe === "GS" ? 3 : ctx.classe === "CP" ? 4 : ctx.classe === "CE1" ? 5 : 6;
    const c = entre(a, 0, n - 1), l = entre(a, 0, n - 1);
    const u = 10, o = 8;
    const lettre = (i: number) => "ABCDEF"[i];
    const nom = (x: number, y: number) => `${lettre(x)}${y + 1}`;
    const grille = [
      ...Array.from({ length: n + 1 }, (_, i) => `<line x1="${o + i * u}" y1="${o}" x2="${o + i * u}" y2="${o + n * u}" stroke="${NOIR}" stroke-width="0.6"/>`),
      ...Array.from({ length: n + 1 }, (_, j) => `<line x1="${o}" y1="${o + j * u}" x2="${o + n * u}" y2="${o + j * u}" stroke="${NOIR}" stroke-width="0.6"/>`),
      ...Array.from({ length: n }, (_, i) => `<text x="${o + i * u + u / 2}" y="${o - 2.2}" text-anchor="middle" font-size="5.5" font-weight="700" font-family="Helvetica, Arial, sans-serif" fill="${BLEU}">${lettre(i)}</text>`),
      ...Array.from({ length: n }, (_, j) => `<text x="${o - 3.5}" y="${o + j * u + u / 2 + 2}" text-anchor="middle" font-size="5.5" font-weight="700" font-family="Helvetica, Arial, sans-serif" fill="${ROUGE}">${j + 1}</text>`),
    ].join("");
    const svg = `<svg viewBox="0 0 ${o + n * u + 2} ${o + n * u + 2}" xmlns="http://www.w3.org/2000/svg">${grille}${ETOILE(o + c * u + u / 2, o + l * u + u / 2, u * 0.38)}</svg>`;
    const juste = nom(c, l);
    // Les coordonnées échangées, une case à côté.
    const faux = [l < n && c < n && l !== c ? nom(l, c) : "", c + 1 < n ? nom(c + 1, l) : "", l + 1 < n ? nom(c, l + 1) : "", c > 0 ? nom(c - 1, l) : "", l > 0 ? nom(c, l - 1) : ""].filter(Boolean);
    const p = propositions(a, juste, [faux[0], ...melanger(a, faux.slice(1))].filter(Boolean));
    return { question: "Dans quelle case est l'étoile ?", visuel: dessin(svg), ...p, ligne: `Case ${BLANC}`, reponse: juste, cle: `${n}:${juste}` };
  },
};

export const TYPES_MATHS: TypeDeCarte[] = [
  COMBIEN, CUBES, DROITE, LETTRES, CHIFFRE, COMPARER, PLUS_GRAND, DEVINETTE, FRACTION, DECIMAL,
  CALCUL, PROBLEME,
  HEURE, MONNAIE, UNITE, LONGUEUR, PERIMETRE, AIRE, DUREE, CONVERSION,
  SOLIDE, FACES, FIGURE, ANGLE, SYMETRIE, CASE,
];
