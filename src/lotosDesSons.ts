// ── Les lotos des sons : attaques, rimes, syllabes, phonèmes ───────────────
//
// L'enseignant les a demandés (31 octobre 2026), à côté du loto des
// syllabes : le loto des attaques et celui des rimes, les lotos des syllabes
// d'attaque et de fin, les lotos des phonèmes d'attaque et « en rime ». Le
// guide « Pour préparer l'apprentissage de la lecture et de l'écriture à
// l'école maternelle » (Éduscol, 2020) en donne la règle — « Loto des
// syllabes » (p. 24), « Loto des phonèmes » (p. 27) : le meneur dit le son,
// chacun pose un jeton sur l'image du mot qui le contient — et les unités :
// « segmenter une syllabe en attaque et en rime, par exemple […] dans tronc il
// y a deux parties /tr/ et /on/ » (p. 12). Chaque loto en prend une, à une
// place : « la syllabe et le phonème sont plus facilement identifiables en
// début ou en fin de mot » (p. 27).
//
// Le son d'un mot se lit avec le déchiffrage des gestes Borel-Maisonny (voir
// gestesBM.ts), syllabe orale par syllabe orale (voir syllabes.ts) : « souris »
// et « riz » finissent par la même syllabe, « chat » et « rat » riment. Ce
// n'est pas un dictionnaire — « ville » n'est pas « fille » — : l'enseignant
// voit le son de chaque mot, et le corrige.

import { HAUTEUR_UTILE_MM, LARGEUR_CONTENU_MM, attributionPour, carte, feuille, gabaritGrille, imgPicto, legende, pagesDeCartes } from "./cartesImprimables";
import { GESTES, coderMot, type Pas } from "./gestesBM";
import { melanger } from "./hasard";
import { motsSimples, type Images, type MotImage } from "./jeuxSons";
import { escapeHtml } from "./print";
import { decouperSyllabes } from "./syllabes";

export type UniteLoto = "attaque" | "rime" | "syllabeAttaque" | "syllabeFin" | "phonemeAttaque" | "phonemeFin";

/** Un loto : son atelier dans Fabriquer, ce qu'on y entend, et d'où vient sa règle. */
export interface LotoDesSons {
  unite: UniteLoto;
  atelier: string;
  nom: string;
  /** Ce que dit le meneur : « la syllabe », « le son »… (le guide parle de « son » pour le phonème, p. 28). */
  quoi: string;
  /** Où on l'entend : au début ou à la fin du mot. */
  debut: boolean;
  /** Deux mots qui vont ensemble, pour la règle : « bateau – banane ». */
  paire: [string, string];
  /** La référence imprimée sous la règle. */
  reference: string;
}

const GUIDE = "« Pour préparer l'apprentissage de la lecture et de l'écriture à l'école maternelle », Éduscol 2020";

export const LOTOS_DES_SONS: LotoDesSons[] = [
  { unite: "attaque", atelier: "lotoAttaques", nom: "Loto des attaques", quoi: "l'attaque", debut: true, paire: ["train", "tracteur"],
    reference: `${GUIDE}, p. 12 (l'attaque et la rime) et p. 27 (loto des phonèmes).` },
  { unite: "rime", atelier: "lotoRimes", nom: "Loto des rimes", quoi: "la rime", debut: false, paire: ["bateau", "gâteau"],
    reference: `${GUIDE}, p. 12 et 24 ; programme de l'école maternelle (2024) : « Repérer et produire des rimes et des assonances ».` },
  { unite: "syllabeAttaque", atelier: "lotoSyllabesAttaque", nom: "Loto des syllabes d'attaque", quoi: "la syllabe", debut: true, paire: ["bateau", "banane"],
    reference: `${GUIDE}, p. 24 (loto des syllabes).` },
  { unite: "syllabeFin", atelier: "lotoSyllabesFin", nom: "Loto des syllabes de fin", quoi: "la syllabe", debut: false, paire: ["souris", "radis"],
    reference: `${GUIDE}, p. 24 (loto des syllabes).` },
  { unite: "phonemeAttaque", atelier: "lotoPhonemesAttaque", nom: "Loto des phonèmes d'attaque", quoi: "le son", debut: true, paire: ["soleil", "sac"],
    reference: `${GUIDE}, p. 26-27 (loto des phonèmes).` },
  { unite: "phonemeFin", atelier: "lotoPhonemesFin", nom: "Loto des phonèmes en rime", quoi: "le son", debut: false, paire: ["lune", "banane"],
    reference: `${GUIDE}, p. 26-27 (loto des phonèmes).` },
];

export const lotoDe = (unite: UniteLoto): LotoDesSons => LOTOS_DES_SONS.find((l) => l.unite === unite)!;
export const lotoDeLAtelier = (atelier: string): LotoDesSons | undefined => LOTOS_DES_SONS.find((l) => l.atelier === atelier);

// ── Le son d'un mot ────────────────────────────────────────────────────────

/** Les sons de la méthode qui font le noyau d'une syllabe ; les autres sont des consonnes (« ill » compris). */
const VOYELLES = new Set(["a", "e", "i", "o", "u", "é", "è", "ou", "eu", "an", "on", "in", "un", "oi", "oin"]);
const estVoyelle = (p: Pas) => p.geste != null && VOYELLES.has(p.geste);
/** Deux consonnes qui ouvrent ensemble une syllabe : /tr/, /pl/… */
const LIQUIDES = new Set(["r", "l"]);
const OCCLUSIVES = new Set(["p", "b", "t", "d", "k", "g", "f", "v"]);

/** Un découpage par les sons, quand celui des lettres ne s'aligne pas sur le déchiffrage : chaque syllabe s'ouvre sur ses consonnes. */
function decoupageSonore(pas: Pas[]): Pas[][] {
  const noyaux = pas.map((p, i) => (estVoyelle(p) ? i : -1)).filter((i) => i >= 0);
  if (noyaux.length <= 1) return [pas];
  const coupes = [0];
  for (let k = 1; k < noyaux.length; k++) {
    // Les consonnes entendues entre deux noyaux : la dernière ouvre la syllabe suivante, deux si elles vont ensemble (/tr/).
    const entre = pas.slice(noyaux[k - 1] + 1, noyaux[k]).map((p, j) => ({ p, i: noyaux[k - 1] + 1 + j })).filter((x) => x.p.geste != null);
    const n = entre.length;
    const ensemble = n >= 2 && OCCLUSIVES.has(entre[n - 2].p.geste!) && LIQUIDES.has(entre[n - 1].p.geste!);
    coupes.push(n === 0 ? noyaux[k] : entre[n - (ensemble ? 2 : 1)].i);
  }
  coupes.push(pas.length);
  return coupes.slice(1).map((fin, k) => pas.slice(coupes[k], fin));
}

/**
 * Le mot, syllabe orale par syllabe orale, chaque lettre avec le son qu'elle
 * fait : le découpage de la classe (« sou-ris »), et le son de chaque morceau.
 */
export function syllabesDuMot(mot: string): Pas[][] {
  const pas = coderMot(mot, { eFinal: false });
  if (!pas.length) return [];
  const syllabes = decouperSyllabes(mot);
  if (pas.map((p) => p.graphie).join("") !== syllabes.join("")) return decoupageSonore(pas);
  const sortie: Pas[][] = syllabes.map(() => []);
  let lu = 0, k = 0, fin = syllabes[0].length;
  for (const p of pas) {
    while (k < syllabes.length - 1 && lu >= fin) fin += syllabes[++k].length;
    sortie[k].push(p);
    lu += p.graphie.length;
  }
  return sortie.filter((s) => s.length > 0);
}

/** Le son d'un mot pour un loto : sa clé, qui dit si deux mots vont ensemble, et ce qu'on en écrit sur la carte du meneur. */
export interface SonDuMot { cle: string; ecrit: string }

const cleDe = (pas: Pas[]) => pas.flatMap((p) => (p.geste ? [p.geste] : [])).join(".");
const enSons = (pas: Pas[]) => pas.flatMap((p) => (p.geste ? [p.geste] : [])).join("");

/** Les lettres d'un morceau, sans les muettes de la fin — sauf le e, qui fait entendre la consonne (« lune ») — ni la double du début (« llon »). */
function lettres(pas: Pas[]): string {
  let fin = pas.length;
  while (fin > 0 && pas[fin - 1].geste == null && !/^e/.test(pas[fin - 1].graphie)) fin--;
  return pas.slice(0, fin).map((p) => p.graphie).join("").replace(/^([b-df-hj-np-tv-z])\1/, "$1");
}

/** Le son d'un mot, déjà découpé, pour un loto ; rien quand le mot n'en a pas — « avion » n'a pas d'attaque. */
function sonDesSyllabes(syl: Pas[][], unite: UniteLoto): SonDuMot | null {
  const sons = syl.flat().filter((p) => p.geste != null);
  if (!sons.length) return null;
  switch (unite) {
    case "phonemeAttaque": return { cle: sons[0].geste!, ecrit: `/${sons[0].geste}/` };
    case "phonemeFin": return { cle: sons[sons.length - 1].geste!, ecrit: `/${sons[sons.length - 1].geste}/` };
    case "attaque": {
      const premiere = syl[0];
      const i = premiere.findIndex(estVoyelle);
      const avant = premiere.slice(0, i < 0 ? premiere.length : i);
      return i > 0 && cleDe(avant) ? { cle: cleDe(avant), ecrit: `/${enSons(avant)}/` } : null;
    }
    case "rime": {
      // Depuis la dernière voyelle de la dernière syllabe : le i de « lion » ou de « pied » s'entend glissé, « lion » rime avec « ballon ».
      const derniere = syl[syl.length - 1];
      const i = derniere.map(estVoyelle).lastIndexOf(true);
      return i < 0 ? null : { cle: cleDe(derniere.slice(i)), ecrit: `-${lettres(derniere.slice(i))}` };
    }
    case "syllabeAttaque": return cleDe(syl[0]) ? { cle: cleDe(syl[0]), ecrit: `« ${lettres(syl[0])} »` } : null;
    case "syllabeFin": {
      const derniere = syl[syl.length - 1];
      return cleDe(derniere) ? { cle: cleDe(derniere), ecrit: `« ${lettres(derniere)} »` } : null;
    }
  }
}

/** Ce que l'enseignant a écrit d'un son, lu son par son : « ch », « tr », un geste de la méthode par ses lettres. */
function sonsEcrits(texte: string): Pas[] {
  const t = texte.toLowerCase().replace(/[/«»\-\s]/g, "");
  // Les noms des sons de la méthode, et leurs écritures, les plus longs d'abord : « oin » avant « oi », « ch » avant « c ».
  const jetons = GESTES.flatMap((g) => [g.id, ...g.graphies].map((ecrit) => ({ ecrit, geste: g.id }))).sort((a, b) => b.ecrit.length - a.ecrit.length);
  const pas: Pas[] = [];
  for (let i = 0; i < t.length;) {
    const j = jetons.find((x) => t.startsWith(x.ecrit, i));
    if (!j) return [];
    pas.push({ graphie: j.ecrit, geste: j.geste });
    i += j.ecrit.length;
  }
  return pas;
}

/**
 * Le son d'un mot pour un loto ; corrigé par l'enseignant quand il l'a écrit
 * lui-même — « ile » pour la rime de « ville » —, lu comme il l'écrit.
 */
export function sonDuMot(mot: string, unite: UniteLoto, correction?: string): SonDuMot | null {
  const c = correction?.trim();
  if (!c) return sonDesSyllabes(syllabesDuMot(mot), unite);
  // Un son, une attaque : les sons de la méthode qu'on a nommés ; une syllabe, une rime : des lettres qu'on lit.
  const pas = unite === "phonemeAttaque" || unite === "phonemeFin" || unite === "attaque" ? sonsEcrits(c) : coderMot(c, { eFinal: false });
  if (!pas.some((p) => p.geste)) return null;
  if (unite === "phonemeAttaque" || unite === "phonemeFin") return sonDesSyllabes([pas], unite);
  if (unite === "attaque") return { cle: cleDe(pas), ecrit: `/${enSons(pas)}/` };
  return { cle: cleDe(pas), ecrit: unite === "rime" ? `-${lettres(pas)}` : `« ${lettres(pas)} »` };
}

// ── La partie ──────────────────────────────────────────────────────────────

export interface ReglagesLotoSons {
  planches: number;
  cases: 6 | 9;
  /** Le meneur pioche une carte et dit le son (la règle du guide) ; ou l'on pioche des images à poser sur celles qui sonnent pareil. */
  jeu: "meneur" | "images";
  legendes: boolean;
  /** Le son d'un mot que l'enseignant a corrigé, par mot. */
  corrections: Record<string, string>;
}

export const REGLAGES_LOTO_SONS: ReglagesLotoSons = { planches: 4, cases: 6, jeu: "meneur", legendes: false, corrections: {} };

/** Les réglages relus, réparés : ce qu'une version plus ancienne a laissé. */
export function reglagesLotoSons(brut: Partial<ReglagesLotoSons>): ReglagesLotoSons {
  const d = REGLAGES_LOTO_SONS;
  const corrections: Record<string, string> = {};
  if (brut.corrections && typeof brut.corrections === "object") {
    for (const [mot, son] of Object.entries(brut.corrections)) if (typeof son === "string" && son.trim()) corrections[mot] = son;
  }
  return {
    planches: typeof brut.planches === "number" && brut.planches >= 1 ? Math.min(12, Math.round(brut.planches)) : d.planches,
    cases: brut.cases === 9 ? 9 : 6,
    jeu: brut.jeu === "images" ? "images" : "meneur",
    legendes: brut.legendes === true,
    corrections,
  };
}

/** Le son d'un mot de la liste, avec la correction de l'enseignant s'il y en a une. */
export const sonDansLaListe = (m: MotImage, unite: UniteLoto, r: Pick<ReglagesLotoSons, "corrections">) =>
  sonDuMot(m.mot, unite, r.corrections[m.mot.toLowerCase()]);

/** Une carte du meneur : le son à dire, et les mots des planches qui le portent. */
export interface Appel { cle: string; ecrit: string; mots: MotImage[] }

export interface PartieDeLoto {
  planches: MotImage[][];
  /** Les cartes du meneur : chaque son des planches, une fois. */
  appels: Appel[];
  /** Les images à piocher, quand on joue sans meneur : une par case, chacune d'un autre mot qui sonne pareil. */
  cartes: MotImage[];
  /** Ce qui manque pour remplir une planche, en clair ; rien quand la partie se joue. */
  manque: string;
}

/**
 * La partie : chaque planche a des images dont les sons sont tous
 * différents — un jeton ne va qu'à une case —, tirées à tour de rôle parmi
 * les mots qui ont ce son, pour que les planches ne se ressemblent pas.
 * Sans meneur, une case ne prend qu'un son porté par deux mots au moins :
 * l'un sur la planche, l'autre à piocher.
 */
export function partieDeLoto(mots: MotImage[], unite: UniteLoto, r: ReglagesLotoSons, hasard: () => number): PartieDeLoto {
  const groupes = new Map<string, { ecrit: string; mots: MotImage[] }>();
  for (const m of motsSimples(mots)) {
    const son = sonDansLaListe(m, unite, r);
    if (!son) continue;
    const g = groupes.get(son.cle) ?? { ecrit: son.ecrit, mots: [] };
    if (!g.mots.some((x) => x.mot.toLowerCase() === m.mot.toLowerCase())) g.mots.push(m);
    groupes.set(son.cle, g);
  }
  const utiles = [...groupes.entries()].filter(([, g]) => r.jeu === "meneur" || g.mots.length >= 2);
  if (utiles.length < r.cases) {
    const vide = { planches: [], appels: [], cartes: [] };
    return r.jeu === "meneur"
      ? { ...vide, manque: `Une planche de ${r.cases} cases demande ${r.cases} sons différents : ces mots n'en donnent que ${utiles.length}.` }
      : { ...vide, manque: `Sans meneur, une planche de ${r.cases} cases demande ${r.cases} sons portés chacun par deux mots : il n'y en a que ${utiles.length}.` };
  }
  const tour = new Map<string, number>();
  const planches: MotImage[][] = [];
  const cartes: MotImage[] = [];
  const surLesPlanches = new Map<string, MotImage[]>();
  for (let p = 0; p < r.planches; p++) {
    planches.push(melanger(hasard, utiles).slice(0, r.cases).map(([cle, g]) => {
      const i = tour.get(cle) ?? Math.floor(hasard() * g.mots.length);
      tour.set(cle, i + 1);
      const m = g.mots[i % g.mots.length];
      if (r.jeu === "images") cartes.push(g.mots[(i + 1) % g.mots.length]);
      const deja = surLesPlanches.get(cle) ?? [];
      if (!deja.includes(m)) surLesPlanches.set(cle, [...deja, m]);
      return m;
    }));
  }
  const appels = melanger(hasard, [...surLesPlanches.entries()]).map(([cle, l]) => ({ cle, ecrit: groupes.get(cle)!.ecrit, mots: l }));
  return { planches, appels, cartes: melanger(hasard, cartes), manque: "" };
}

// ── La feuille ─────────────────────────────────────────────────────────────

/** La règle, telle qu'on la lit en tête de la première page. */
export function regleDuLoto(l: LotoDesSons, jeu: ReglagesLotoSons["jeu"]): string {
  const ou = l.debut ? "commence par" : "finit par";
  if (jeu === "images") {
    const comme = l.unite === "rime" ? "rime avec le sien" : `${l.debut ? "commence" : "finit"} comme le sien`;
    return `On pioche une image et on dit son mot. Si une image de sa planche a un mot qui ${comme} (${l.paire[0]} – ${l.paire[1]}), on l'y pose. La planche pleine a gagné.`;
  }
  return `Le meneur pioche une carte et dit ${l.quoi} qu'elle porte. Chacun cherche sur sa planche l'image dont le mot ${ou} ${l.quoi === "le son" ? "ce son" : `cette ${l.quoi.replace(/^la |^l'/, "")}`}, et y pose un jeton. La planche pleine a gagné.`;
}

export function htmlLotoDesSons(partie: PartieDeLoto, l: LotoDesSons, images: Images, r: ReglagesLotoSons): string {
  const lignes = r.cases / 3;
  const cote = lignes === 2 ? 48 : 36;
  const image = (m: MotImage) => (m.id != null ? images[m.id] : undefined);
  const regle = `<div class="regle"><b>${escapeHtml(l.nom)}</b>${escapeHtml(regleDuLoto(l, r.jeu))}<span class="reference">${escapeHtml(l.reference)}</span></div>`;
  const pages: string[] = [];
  for (let i = 0; i < partie.planches.length; i += 2) {
    const deux = partie.planches.slice(i, i + 2).map((pl, k) =>
      `<div class="ls-planche"><div class="ls-planche-titre">${escapeHtml(l.nom)} — planche ${i + k + 1}</div>
        <div class="grille" style="${gabaritGrille({ colonnes: 3, lignes, hauteurMm: cote, carre: true }, false)}">
        ${pl.map((m) => carte(`${imgPicto(image(m), m.mot)}${legende(m.mot, r.legendes)}`, "ls-case")).join("")}</div></div>`).join("");
    pages.push(`<div class="page">${i === 0 ? regle : ""}${deux}</div>`);
  }
  const pioche = r.jeu === "meneur"
    ? pagesDeCartes(partie.appels.map((a) => carte(`<div class="ls-son">${escapeHtml(a.ecrit)}</div>
        <div class="ls-comme">comme dans ${escapeHtml(a.mots.map((m) => m.mot).join(", "))}</div>`, "ls-appel")),
      { colonnes: 4, lignes: 6, hauteurMm: 38 }, `<div class="sous">${escapeHtml(l.nom)} — les cartes du meneur (${partie.appels.length})</div>`)
    : pagesDeCartes(partie.cartes.map((m) => carte(`${imgPicto(image(m), m.mot)}${legende(m.mot, r.legendes)}`)),
      // Des cartes de la taille des cases, qu'on pose dessus.
      { colonnes: Math.floor(LARGEUR_CONTENU_MM / cote), lignes: Math.floor((HAUTEUR_UTILE_MM - 12) / cote), hauteurMm: cote, carre: true },
      `<div class="sous">${escapeHtml(l.nom)} — les images à piocher (${partie.cartes.length})</div>`);
  return feuille(`${pages.join("")}${pioche}${attributionPour([...partie.planches.flat(), ...partie.cartes].map((m) => m.id))}`, "ls");
}

export const STYLE_LOTOS_DES_SONS = `
  .feuille.ls .ls-appel { gap: 1.5mm; }
  .feuille.ls .ls-son { font-size: 26px; font-weight: 800; line-height: 1.1; text-align: center; }
  .feuille.ls .ls-comme { font-size: 10px; color: #687087; text-align: center; line-height: 1.3; }
`;
