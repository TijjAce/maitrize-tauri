// Problèmes en barres : énoncés, schémas et feuille à imprimer.
//
// Le schéma en barres montre la structure d'un problème avant tout calcul :
// un tout et ses parties, des parts égales, ou une quantité plusieurs fois
// plus grande qu'une autre. L'élève voit ce qui manque au lieu de deviner
// l'opération d'après les mots de l'énoncé.
//
// Tout se tire d'une graine : les mêmes réglages redonnent la même feuille,
// et un problème se retire seul sans toucher aux autres. Les énoncés
// n'emploient jamais « il » ni « elle » : les prénoms saisis par l'enseignant
// peuvent être ceux de ses élèves, sans que l'application ait à deviner leur
// genre.

import { escapeHtml } from "./print";

// ── Hasard reproductible ───────────────────────────────────────────────────

/** Générateur pseudo-aléatoire à graine (mulberry32). */
export function hasard(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const entier = (r: () => number, min: number, max: number) => min + Math.floor(r() * (max - min + 1));

function parmi<T>(r: () => number, liste: readonly T[]): T {
  return liste[Math.floor(r() * liste.length)];
}

/** La graine du problème n° `i` d'une feuille. */
export const graineDuProbleme = (graine: number, i: number) =>
  (Math.imul((graine >>> 0) ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(i + 1, 0xc2b2ae35)) >>> 0;

// ── Mots et nombres ────────────────────────────────────────────────────────

/** 1000 → « 1 000 », comme on l'écrit en classe. */
export const nombre = (n: number) => n.toLocaleString("fr-FR");

/** « de billes », « d'animaux ». */
export const de = (mot: string) => (/^[aeiouyàâéèêëîïôœù]/i.test(mot) ? `d'${mot}` : `de ${mot}`);

/** « a, b et c ». */
const enumeration = (elements: string[]) =>
  elements.length < 2 ? elements.join("") : `${elements.slice(0, -1).join(", ")} et ${elements[elements.length - 1]}`;

export const PRENOMS = ["Léa", "Tom", "Inès", "Noah", "Jade", "Adam", "Lina", "Sacha", "Emma", "Yanis", "Chloé", "Rayan"];

/** Les prénoms saisis, séparés par des virgules, sans doublon. Aucun : les problèmes prennent `PRENOMS`. */
export function lirePrenoms(saisie: string): string[] {
  const liste = saisie.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
  return [...new Set(liste)];
}

// ── Modèle ─────────────────────────────────────────────────────────────────

/** Une case du schéma : sa valeur, et si l'énoncé la donne. */
export interface Case { valeur: number; connue: boolean }

export type Schema =
  | { forme: "parties"; tout: Case; parties: Case[] }
  | { forme: "parts-egales"; tout: Case; part: Case; nombre: Case }
  | { forme: "comparaison"; petit: Case; grand: Case; fois: number; noms: [string, string] };

export interface Probleme {
  schema: Schema;
  /** L'énoncé ; vide pour un schéma seul. */
  enonce: string;
  calcul: string;
  reponse: number;
  /** La phrase réponse du corrigé ; vide pour un schéma seul. */
  phrase: string;
}

/** Les problèmes d'une feuille, chacun tiré de sa graine, sans doublon. */
function feuille(
  nombreVoulu: number, graine: number, retirages: Record<number, number>,
  tirer: (graine: number, i: number) => { probleme: Probleme; cle: string },
): Probleme[] {
  const n = Math.min(12, Math.max(1, Math.round(nombreVoulu) || 1));
  const vues = new Set<string>();
  const sortie: Probleme[] = [];
  for (let i = 0; i < n; i++) {
    const depart = retirages[i] ?? graineDuProbleme(graine, i);
    let tire = tirer(depart, i);
    for (let essai = 1; essai < 25 && vues.has(tire.cle); essai++) tire = tirer(depart + essai * 7919, i);
    vues.add(tire.cle);
    sortie.push(tire.probleme);
  }
  return sortie;
}

// ── Problèmes additifs : parties et tout ───────────────────────────────────

interface Partie { groupe: string; attribut: string }
interface ContexteParties { tout: string; lieu?: string; parties: Partie[] }

const couleurs = (nom: string, adjectifs: string[]): Partie[] =>
  adjectifs.map((a) => ({ groupe: `${nom} ${a}`, attribut: a }));
const sortes = (noms: string[]): Partie[] => noms.map((n) => ({ groupe: n, attribut: `des ${n}` }));

/** Situations : une personne possède (« Léa a… ») ou un lieu contient (« Dans le pré, il y a… »). */
export const CONTEXTES_PARTIES: ContexteParties[] = [
  { tout: "billes", parties: couleurs("billes", ["rouges", "bleues", "vertes"]) },
  { tout: "crayons", parties: couleurs("crayons", ["rouges", "bleus", "verts"]) },
  { tout: "cartes", parties: couleurs("cartes", ["rouges", "bleues", "jaunes"]) },
  { tout: "voitures", parties: couleurs("voitures", ["rouges", "bleues", "noires"]) },
  { tout: "pommes", lieu: "Dans le panier", parties: couleurs("pommes", ["rouges", "vertes", "jaunes"]) },
  { tout: "poissons", lieu: "Dans l'aquarium", parties: couleurs("poissons", ["rouges", "jaunes", "bleus"]) },
  { tout: "fleurs", lieu: "Dans le jardin", parties: couleurs("fleurs", ["rouges", "jaunes", "blanches"]) },
  { tout: "animaux", lieu: "Dans le pré", parties: sortes(["moutons", "vaches", "chèvres"]) },
  { tout: "véhicules", lieu: "Sur le parking", parties: sortes(["voitures", "camions", "motos"]) },
  { tout: "livres", lieu: "Dans la bibliothèque de la classe", parties: sortes(["albums", "bandes dessinées", "documentaires"]) },
  {
    tout: "gâteaux", lieu: "Sur la table", parties: [
      { groupe: "gâteaux au chocolat", attribut: "au chocolat" },
      { groupe: "gâteaux à la fraise", attribut: "à la fraise" },
      { groupe: "gâteaux à la vanille", attribut: "à la vanille" },
    ],
  },
  { tout: "élèves", lieu: "Dans la classe", parties: sortes(["filles", "garçons"]) },
  { tout: "personnes", lieu: "Dans le bus", parties: sortes(["enfants", "adultes"]) },
];

export type InconnuePartieTout = "tout" | "partie" | "melange";

export interface ReglagesPartieTout {
  nombre: number;
  parties: number;
  inconnue: InconnuePartieTout;
  /** Le tout ne dépasse pas ce nombre. */
  max: number;
  enonces: boolean;
  prenoms: string[];
}

export const PLAFONDS = [10, 20, 100, 1000];

/** Le plus petit tout et la plus petite partie, selon les nombres travaillés. */
function plage(max: number, parties: number) {
  const connues: Record<number, { toutMin: number; partMin: number }> = {
    10: { toutMin: 4, partMin: 2 },
    20: { toutMin: 11, partMin: 2 },
    100: { toutMin: 21, partMin: 10 },
    1000: { toutMin: 201, partMin: 100 },
  };
  const p = connues[max] ?? { toutMin: Math.ceil(max / 5), partMin: Math.max(2, Math.floor(max / 20)) };
  const plafond = Math.max(max, p.partMin * parties);
  return { toutMin: Math.min(plafond, Math.max(p.toutMin, p.partMin * parties)), partMin: p.partMin, plafond };
}

/** Coupe `tout` en `combien` parties d'au moins `mini`, dans un ordre quelconque. */
function partager(r: () => number, tout: number, combien: number, mini: number): number[] {
  const parts: number[] = [];
  let reste = tout;
  for (let k = combien; k > 1; k--) {
    const p = entier(r, mini, reste - mini * (k - 1));
    parts.push(p);
    reste -= p;
  }
  parts.push(reste);
  for (let i = parts.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }
  return parts;
}

/**
 * Un problème partie-tout. En alternance, les problèmes pairs cherchent le
 * tout et les impairs une partie : retirer un problème garde sa nature.
 * La partie cherchée vient toujours en dernier, dans l'énoncé (« les autres »)
 * comme sur le schéma.
 */
export function problemePartieTout(reglages: ReglagesPartieTout, graine: number, i: number): Probleme & { cle: string } {
  const r = hasard(graine);
  const combien = reglages.parties === 3 ? 3 : 2;
  const { toutMin, partMin, plafond } = plage(reglages.max, combien);
  const tout = entier(r, toutMin, plafond);
  const valeurs = partager(r, tout, combien, partMin);
  const cherche = reglages.inconnue === "melange" ? (i % 2 === 0 ? "tout" : "partie") : reglages.inconnue;

  const contexte = parmi(r, CONTEXTES_PARTIES.filter((c) => c.parties.length >= combien));
  const categories = [...contexte.parties];
  for (let k = categories.length - 1; k > 0; k--) {
    const j = Math.floor(r() * (k + 1));
    [categories[k], categories[j]] = [categories[j], categories[k]];
  }
  const cats = categories.slice(0, combien);
  const qui = parmi(r, reglages.prenoms.length ? reglages.prenoms : PRENOMS);
  const personne = !contexte.lieu;
  const n = nombre;
  const derniere = combien - 1;

  const schema: Schema = {
    forme: "parties",
    tout: { valeur: tout, connue: cherche !== "tout" },
    parties: valeurs.map((v, k) => ({ valeur: v, connue: cherche === "tout" || k < derniere })),
  };
  const cle = `${cherche}:${tout}:${[...valeurs].sort((a, b) => a - b).join("+")}`;

  if (cherche === "tout") {
    const liste = enumeration(valeurs.map((v, k) => `${n(v)} ${cats[k].groupe}`));
    return {
      schema, reponse: tout, cle,
      calcul: `${valeurs.map(n).join(" + ")} = ${n(tout)}`,
      enonce: !reglages.enonces ? "" : personne
        ? `${qui} a ${liste}. Combien ${de(contexte.tout)} a ${qui} en tout ?`
        : `${contexte.lieu}, il y a ${liste}. Combien y a-t-il ${de(contexte.tout)} en tout ?`,
      phrase: !reglages.enonces ? "" : personne
        ? `${qui} a ${n(tout)} ${contexte.tout} en tout.`
        : `Il y a ${n(tout)} ${contexte.tout} en tout.`,
    };
  }

  const inconnue = cats[derniere];
  const connues = valeurs.slice(0, derniere).map((v, k) =>
    k === 0 ? `${n(v)} ${contexte.tout} sont ${cats[k].attribut}` : `${n(v)} sont ${cats[k].attribut}`);
  const debut = personne ? `${qui} a ${n(tout)} ${contexte.tout}.` : `${contexte.lieu}, il y a ${n(tout)} ${contexte.tout}.`;
  return {
    schema, reponse: valeurs[derniere], cle,
    calcul: `${n(tout)} − ${valeurs.slice(0, derniere).map(n).join(" − ")} = ${n(valeurs[derniere])}`,
    enonce: !reglages.enonces ? "" : `${debut} ${[...connues, `les autres sont ${inconnue.attribut}`].join(", ")}. `
      + (personne ? `Combien ${de(inconnue.groupe)} a ${qui} ?` : `Combien y a-t-il ${de(inconnue.groupe)} ?`),
    phrase: !reglages.enonces ? "" : personne
      ? `${qui} a ${n(valeurs[derniere])} ${inconnue.groupe}.`
      : `Il y a ${n(valeurs[derniere])} ${inconnue.groupe}.`,
  };
}

export function genererPartieTout(reglages: ReglagesPartieTout, graine: number, retirages: Record<number, number> = {}): Probleme[] {
  return feuille(reglages.nombre, graine, retirages, (g, i) => {
    const { cle, ...probleme } = problemePartieTout(reglages, g, i);
    return { probleme, cle };
  });
}

// ── Problèmes multiplicatifs ───────────────────────────────────────────────

export type TypeMultiplicatif = "tout" | "part" | "nombre" | "grand" | "petit";

export const TYPES_MULTIPLICATIFS: { id: TypeMultiplicatif; libelle: string; exemple: string }[] = [
  { id: "tout", libelle: "Chercher le tout", exemple: "4 boîtes de 6 crayons : combien de crayons ?" },
  { id: "part", libelle: "Chercher la valeur d'une part", exemple: "24 crayons dans 4 boîtes : combien par boîte ?" },
  { id: "nombre", libelle: "Chercher le nombre de parts", exemple: "24 crayons, 6 par boîte : combien de boîtes ?" },
  { id: "grand", libelle: "Comparer : chercher la plus grande quantité", exemple: "3 fois plus que 4 billes" },
  { id: "petit", libelle: "Comparer : chercher la plus petite quantité", exemple: "12 billes, c'est 3 fois plus que… ?" },
];

export interface ReglagesMultiplicatifs {
  nombre: number;
  types: TypeMultiplicatif[];
  /** Les deux facteurs ne dépassent pas ce nombre. */
  table: number;
  enonces: boolean;
  prenoms: string[];
}

type Phrases = (qui: string, n: string, p: string, tout: string) => [string, string];
interface ContexteGroupes { plafond?: number; tout: Phrases; part: Phrases; nombre: Phrases }

/** Des parts égales : chaque contexte dit les trois problèmes, énoncé puis phrase réponse. */
export const CONTEXTES_GROUPES: ContexteGroupes[] = [
  {
    tout: (q, n, p, t) => [`${q} a ${n} boîtes de crayons. Dans chaque boîte, il y a ${p} crayons. Combien de crayons a ${q} en tout ?`, `${q} a ${t} crayons en tout.`],
    part: (q, n, p, t) => [`${q} range ${t} crayons dans ${n} boîtes. Chaque boîte contient le même nombre de crayons. Combien de crayons y a-t-il dans chaque boîte ?`, `Il y a ${p} crayons dans chaque boîte.`],
    nombre: (q, n, p, t) => [`${q} range ${t} crayons dans des boîtes. Chaque boîte contient ${p} crayons. Combien de boîtes remplit ${q} ?`, `${q} remplit ${n} boîtes.`],
  },
  {
    tout: (q, n, p, t) => [`${q} a ${n} sacs de billes. Dans chaque sac, il y a ${p} billes. Combien de billes a ${q} en tout ?`, `${q} a ${t} billes en tout.`],
    part: (q, n, p, t) => [`${q} met ${t} billes dans ${n} sacs. Chaque sac contient le même nombre de billes. Combien de billes y a-t-il dans chaque sac ?`, `Il y a ${p} billes dans chaque sac.`],
    nombre: (q, n, p, t) => [`${q} met ${t} billes dans des sacs. Chaque sac contient ${p} billes. Combien de sacs remplit ${q} ?`, `${q} remplit ${n} sacs.`],
  },
  {
    tout: (q, n, p, t) => [`${q} fait ${n} bouquets. Dans chaque bouquet, il y a ${p} fleurs. Combien de fleurs utilise ${q} ?`, `${q} utilise ${t} fleurs.`],
    part: (q, n, p, t) => [`${q} fait ${n} bouquets avec ${t} fleurs. Tous les bouquets ont le même nombre de fleurs. Combien de fleurs y a-t-il dans chaque bouquet ?`, `Il y a ${p} fleurs dans chaque bouquet.`],
    nombre: (q, n, p, t) => [`Avec ${t} fleurs, ${q} fait des bouquets de ${p} fleurs. Combien de bouquets fait ${q} ?`, `${q} fait ${n} bouquets.`],
  },
  {
    tout: (_q, n, p, t) => [`Sur la table, il y a ${n} assiettes. Sur chaque assiette, il y a ${p} gâteaux. Combien y a-t-il de gâteaux en tout ?`, `Il y a ${t} gâteaux en tout.`],
    part: (q, n, p, t) => [`${q} pose ${t} gâteaux sur ${n} assiettes. Chaque assiette a le même nombre de gâteaux. Combien de gâteaux y a-t-il sur chaque assiette ?`, `Il y a ${p} gâteaux sur chaque assiette.`],
    nombre: (q, n, p, t) => [`${q} pose ${t} gâteaux sur des assiettes, ${p} gâteaux par assiette. Combien d'assiettes faut-il ?`, `Il faut ${n} assiettes.`],
  },
  {
    tout: (q, n, p, t) => [`${q} colle des images dans son album : ${n} pages, avec ${p} images sur chaque page. Combien d'images colle ${q} ?`, `${q} colle ${t} images.`],
    part: (q, n, p, t) => [`${q} colle ${t} images sur ${n} pages de son album. Chaque page a le même nombre d'images. Combien d'images y a-t-il sur chaque page ?`, `Il y a ${p} images sur chaque page.`],
    nombre: (q, n, p, t) => [`${q} colle ${t} images dans son album, ${p} images par page. Combien de pages remplit ${q} ?`, `${q} remplit ${n} pages.`],
  },
  {
    plafond: 30,
    tout: (_q, n, p, t) => [`Pour le sport, la classe fait ${n} équipes. Dans chaque équipe, il y a ${p} élèves. Combien y a-t-il d'élèves en tout ?`, `Il y a ${t} élèves en tout.`],
    part: (_q, n, p, t) => [`Pour le sport, ${t} élèves forment ${n} équipes. Toutes les équipes ont le même nombre d'élèves. Combien y a-t-il d'élèves dans chaque équipe ?`, `Il y a ${p} élèves dans chaque équipe.`],
    nombre: (_q, n, p, t) => [`Pour le sport, ${t} élèves forment des équipes de ${p} élèves. Combien d'équipes y a-t-il ?`, `Il y a ${n} équipes.`],
  },
  {
    plafond: 60,
    tout: (_q, n, p, t) => [`Dans la salle, il y a ${n} tables. Autour de chaque table, il y a ${p} chaises. Combien y a-t-il de chaises en tout ?`, `Il y a ${t} chaises en tout.`],
    part: (_q, n, p, t) => [`Dans la salle, ${t} chaises sont placées autour de ${n} tables, le même nombre autour de chaque table. Combien y a-t-il de chaises autour de chaque table ?`, `Il y a ${p} chaises autour de chaque table.`],
    nombre: (_q, n, p, t) => [`Dans la salle, on place ${p} chaises autour de chaque table. Il y a ${t} chaises. Combien de tables faut-il ?`, `Il faut ${n} tables.`],
  },
];

/** Ce qu'on compare, au pluriel. */
export const OBJETS_COMPARES = ["billes", "images", "cartes", "livres", "points", "timbres", "coquillages"];

export function problemeMultiplicatif(reglages: ReglagesMultiplicatifs, graine: number, i: number): Probleme & { cle: string } {
  const r = hasard(graine);
  const types = reglages.types.length ? reglages.types : (["tout"] as TypeMultiplicatif[]);
  const type = types[i % types.length];
  const table = Math.min(10, Math.max(2, Math.round(reglages.table) || 10));
  const prenoms = reglages.prenoms.length ? reglages.prenoms : PRENOMS;
  const qui = parmi(r, prenoms);
  const n = nombre;

  if (type === "grand" || type === "petit") {
    const petit = entier(r, 2, table);
    const fois = entier(r, 2, table);
    const grand = petit * fois;
    const autres = prenoms.filter((p) => p !== qui);
    const autre = parmi(r, autres.length ? autres : PRENOMS.filter((p) => p !== qui));
    const objets = parmi(r, OBJETS_COMPARES);
    const [a, b] = [qui, autre];
    const schema: Schema = {
      forme: "comparaison", fois,
      petit: { valeur: petit, connue: type === "grand" },
      grand: { valeur: grand, connue: type === "petit" },
      noms: reglages.enonces ? [a, b] : ["A", "B"],
    };
    const cle = `${type}:${petit}x${fois}`;
    if (type === "grand") {
      return {
        schema, cle, reponse: grand, calcul: `${n(petit)} × ${n(fois)} = ${n(grand)}`,
        enonce: reglages.enonces ? `${a} a ${n(petit)} ${objets}. ${b} a ${n(fois)} fois plus ${de(objets)} que ${a}. Combien ${de(objets)} a ${b} ?` : "",
        phrase: reglages.enonces ? `${b} a ${n(grand)} ${objets}.` : "",
      };
    }
    return {
      schema, cle, reponse: petit, calcul: `${n(grand)} : ${n(fois)} = ${n(petit)}`,
      enonce: reglages.enonces ? `${b} a ${n(grand)} ${objets}. C'est ${n(fois)} fois plus que ${a}. Combien ${de(objets)} a ${a} ?` : "",
      phrase: reglages.enonces ? `${a} a ${n(petit)} ${objets}.` : "",
    };
  }

  const parts = entier(r, 2, table);
  const part = entier(r, 2, table);
  const tout = parts * part;
  const schema: Schema = {
    forme: "parts-egales",
    tout: { valeur: tout, connue: type !== "tout" },
    part: { valeur: part, connue: type !== "part" },
    nombre: { valeur: parts, connue: type !== "nombre" },
  };
  const contexte = parmi(r, CONTEXTES_GROUPES.filter((c) => !c.plafond || tout <= c.plafond));
  const [enonce, phrase] = contexte[type](qui, n(parts), n(part), n(tout));
  const calcul = type === "tout" ? `${n(parts)} × ${n(part)} = ${n(tout)}`
    : type === "part" ? `${n(tout)} : ${n(parts)} = ${n(part)}`
    : `${n(tout)} : ${n(part)} = ${n(parts)}`;
  return {
    schema, calcul, cle: `${type}:${parts}x${part}`,
    reponse: type === "tout" ? tout : type === "part" ? part : parts,
    enonce: reglages.enonces ? enonce : "",
    phrase: reglages.enonces ? phrase : "",
  };
}

export function genererMultiplicatifs(reglages: ReglagesMultiplicatifs, graine: number, retirages: Record<number, number> = {}): Probleme[] {
  return feuille(reglages.nombre, graine, retirages, (g, i) => {
    const { cle, ...probleme } = problemeMultiplicatif(reglages, g, i);
    return { probleme, cle };
  });
}

// ── Schémas ────────────────────────────────────────────────────────────────

/** `nombres` : l'élève voit les nombres donnés et « ? » ; `vide` : il remplit tout ; `corrige` : tout est rempli. */
export type ModeSchema = "nombres" | "vide" | "corrige";

const BLEU = "#2438d6";
const BLEU_FONCE = "#1a1f73";
const ROUGE = "#d33a32";
const PRUNE = "#a23b6b";
const COULEURS_PARTIES = [ROUGE, PRUNE, "#2f855a"];
const VERT = "#15803d";
const VERT_FOND = "#e6f6ec";
const POLICE = "Arial, Helvetica, sans-serif";
const LARGEUR = 520;

const arrondi = (v: number) => Math.round(v * 10) / 10;

/**
 * Largeurs proportionnelles aux valeurs, sans qu'aucune case ne descende sous
 * `mini` : une partie de 2 face à un tout de 1 000 doit rester lisible.
 */
export function largeurs(valeurs: number[], total: number, mini: number): number[] {
  if (!valeurs.length) return [];
  if (valeurs.length * mini >= total) return valeurs.map(() => total / valeurs.length);
  const fixes = new Set<number>();
  for (;;) {
    const libres = valeurs.map((_, k) => k).filter((k) => !fixes.has(k));
    const place = total - fixes.size * mini;
    const somme = libres.reduce((s, k) => s + valeurs[k], 0);
    const l = valeurs.map((v, k) => (fixes.has(k) ? mini : somme > 0 ? (place * v) / somme : place / libres.length));
    const etroites = libres.filter((k) => l[k] < mini);
    if (!etroites.length) return l;
    etroites.forEach((k) => fixes.add(k));
  }
}

function contenu(c: Case, mode: ModeSchema): { texte: string; trouvee: boolean } {
  if (mode === "vide") return { texte: "", trouvee: false };
  if (c.connue) return { texte: nombre(c.valeur), trouvee: false };
  return mode === "corrige" ? { texte: nombre(c.valeur), trouvee: true } : { texte: "?", trouvee: false };
}

function texte(x: number, y: number, valeur: string, taille: number, couleur: string, extra = ""): string {
  return `<text x="${arrondi(x)}" y="${arrondi(y)}" text-anchor="middle" dominant-baseline="central" font-family="${POLICE}" `
    + `font-size="${arrondi(taille)}" fill="${couleur}"${extra}>${escapeHtml(valeur)}</text>`;
}

/** Une case : son cadre et, selon le mode, son nombre ou « ? ». */
function boite(x: number, y: number, l: number, h: number, trait: string, c: Case | null, mode: ModeSchema,
  { taille = 30, encre = trait, pointille = false }: { taille?: number; encre?: string; pointille?: boolean } = {}): string {
  const { texte: valeur, trouvee } = c ? contenu(c, mode) : { texte: "", trouvee: false };
  const cadre = `<rect x="${arrondi(x)}" y="${arrondi(y)}" width="${arrondi(l)}" height="${h}" fill="${trouvee ? VERT_FOND : "#fff"}" `
    + `stroke="${trait}" stroke-width="3"${pointille ? ' stroke-dasharray="8 6"' : ""}/>`;
  if (!valeur) return cadre;
  const place = Math.min(taille, (l - 10) / Math.max(1, valeur.length * 0.58));
  return cadre + texte(x + l / 2, y + h / 2 + 1, valeur, place, trouvee ? VERT : encre, trouvee ? ' font-weight="700"' : "");
}

function etiquette(x: number, y: number, valeur: string, taille = 18, couleur = "#222"): string {
  return texte(x, y, valeur, taille, couleur, ' font-weight="600" letter-spacing="1"');
}

/** Accolade à plat sous une rangée de cases. */
const accolade = (x1: number, x2: number, y: number) =>
  `<path d="M ${arrondi(x1 + 2)} ${y} v 8 H ${arrondi(x2 - 2)} v -8 M ${arrondi((x1 + x2) / 2)} ${y + 8} v 7" fill="none" stroke="#555" stroke-width="2"/>`;

const svg = (hauteur: number, corps: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${hauteur}" role="img" aria-label="Schéma en barres">${corps}</svg>`;

function schemaParties(s: Extract<Schema, { forme: "parties" }>, mode: ModeSchema): string {
  const x0 = 10, l = LARGEUR - 20, h = 56;
  const tailles = largeurs(s.parties.map((p) => p.valeur), l, 70);
  let x = x0;
  const parties = s.parties.map((p, k) => {
    const couleur = COULEURS_PARTIES[k % COULEURS_PARTIES.length];
    const morceau = boite(x, 108, tailles[k], h, couleur, p, mode)
      + etiquette(x + tailles[k] / 2, 190, "PARTIE", Math.min(18, tailles[k] / 4.2));
    x += tailles[k];
    return morceau;
  }).join("");
  return svg(206, etiquette(LARGEUR / 2, 20, "TOUT")
    + boite(x0, 36, l, h, BLEU, s.tout, mode, { taille: 32, encre: BLEU_FONCE }) + parties);
}

function schemaPartsEgales(s: Extract<Schema, { forme: "parts-egales" }>, mode: ModeSchema): string {
  const x0 = 10, l = LARGEUR - 20, h = 56, y = 108;
  const nombreVisible = s.nombre.connue || mode === "corrige";
  let rangee = "";
  if (nombreVisible) {
    const largeur = l / s.nombre.valeur;
    for (let k = 0; k < s.nombre.valeur; k++) {
      // « ? » dans la première part seulement : une rangée de points
      // d'interrogation se lirait comme autant de nombres différents.
      const montree = s.part.connue || mode === "corrige" || k === 0 ? s.part : null;
      rangee += boite(x0 + k * largeur, y, largeur, h, ROUGE, montree, mode, { taille: 28 });
    }
  } else {
    // Nombre de parts inconnu : deux parts, puis la suite en pointillés. Les
    // dessiner toutes donnerait la réponse à compter.
    const largeur = Math.min((l * s.part.valeur) / Math.max(1, s.tout.valeur), l / 3);
    rangee += boite(x0, y, largeur, h, ROUGE, s.part, mode, { taille: 28 })
      + boite(x0 + largeur, y, largeur, h, ROUGE, s.part, mode, { taille: 28 })
      + boite(x0 + 2 * largeur, y, l - 2 * largeur, h, ROUGE, null, mode, { pointille: true })
      + texte(x0 + 2 * largeur + (l - 2 * largeur) / 2, y + h / 2, "…", 30, ROUGE);
  }
  const combien = mode === "vide" ? "" : nombreVisible ? nombre(s.nombre.valeur) : "?";
  const trouvee = mode === "corrige" && !s.nombre.connue;
  const libelle = etiquette(LARGEUR / 2, 198, `${combien ? `${combien} ` : ""}PARTS ÉGALES`, 18, trouvee ? VERT : "#222");
  return svg(214, etiquette(LARGEUR / 2, 20, "TOUT")
    + boite(x0, 36, l, h, BLEU, s.tout, mode, { taille: 32, encre: BLEU_FONCE })
    + rangee + accolade(x0, x0 + l, y + h + 8) + libelle);
}

function schemaComparaison(s: Extract<Schema, { forme: "comparaison" }>, mode: ModeSchema): string {
  const xBarres = 112, h = 48, y1 = 12, y2 = 82;
  const unite = Math.min(90, 320 / s.fois);
  const nom = (y: number, valeur: string) =>
    `<text x="10" y="${y}" dominant-baseline="central" font-family="${POLICE}" font-size="18" font-weight="700" fill="#222"`
    + `${valeur.length > 8 ? ' textLength="92" lengthAdjust="spacingAndGlyphs"' : ""}>${escapeHtml(valeur)}</text>`;
  let corps = nom(y1 + h / 2, s.noms[0]) + boite(xBarres, y1, unite, h, ROUGE, s.petit, mode, { taille: 26 });
  corps += nom(y2 + h / 2, s.noms[1]);
  for (let k = 0; k < s.fois; k++) corps += boite(xBarres + k * unite, y2, unite, h, PRUNE, null, mode);
  const fin = xBarres + s.fois * unite;
  corps += accolade(xBarres, fin, y2 + h + 8);
  const { texte: total, trouvee } = contenu(s.grand, mode);
  if (total) corps += texte((xBarres + fin) / 2, y2 + h + 34, total, 24, trouvee ? VERT : PRUNE, trouvee ? ' font-weight="700"' : "");
  if (mode !== "vide") corps += texte(fin + 34, y2 + h / 2, `× ${nombre(s.fois)}`, 22, PRUNE, ' font-weight="600"');
  return svg(184, corps);
}

export function schemaSvg(s: Schema, mode: ModeSchema): string {
  switch (s.forme) {
    case "parties": return schemaParties(s, mode);
    case "parts-egales": return schemaPartsEgales(s, mode);
    case "comparaison": return schemaComparaison(s, mode);
  }
}

// ── La feuille ─────────────────────────────────────────────────────────────

export interface OptionsFeuille {
  titre: string;
  /** Pour les problèmes rédigés : schéma avec les nombres, à compléter, ou à dessiner. */
  schema: "nombres" | "vide" | "sans";
  corrige: boolean;
  grandTexte: boolean;
  majuscules: boolean;
}

export const classesFeuille = (o: OptionsFeuille) =>
  ["pb-feuille", o.grandTexte && "pb-grand", o.majuscules && "pb-majuscules"].filter(Boolean).join(" ");

const numero = (i: number) => `<div class="pb-numero">${i + 1}</div>`;

export function blocProbleme(p: Probleme, i: number, o: OptionsFeuille): string {
  if (!p.enonce) {
    return `<section class="pb-probleme pb-seul">${numero(i)}<div class="pb-contenu"><div class="pb-schema">${schemaSvg(p.schema, "nombres")}</div></div></section>`;
  }
  const schema = o.schema === "sans"
    ? `<div class="pb-cadre">Mon schéma</div>`
    : `<div class="pb-schema">${schemaSvg(p.schema, o.schema)}</div>`;
  return `<section class="pb-probleme">${numero(i)}<div class="pb-contenu">`
    + `<p class="pb-enonce">${escapeHtml(p.enonce)}</p>${schema}`
    + `<div class="pb-reponse"><div>Calcul : <span class="pb-ligne"></span></div><div>Réponse : <span class="pb-ligne"></span></div></div>`
    + `</div></section>`;
}

export function blocCorrige(p: Probleme, i: number): string {
  return `<section class="pb-probleme${p.enonce ? "" : " pb-seul"}">${numero(i)}<div class="pb-contenu">`
    + (p.enonce ? `<p class="pb-enonce pb-rappel">${escapeHtml(p.enonce)}</p>` : "")
    + `<div class="pb-schema">${schemaSvg(p.schema, "corrige")}</div>`
    + `<p class="pb-solution"><b>Calcul :</b> ${escapeHtml(p.calcul)}${p.phrase ? ` · <b>Réponse :</b> ${escapeHtml(p.phrase)}` : ""}</p>`
    + `</div></section>`;
}

/** Le corps de la feuille à imprimer, suivi de son corrigé sur une nouvelle page si demandé. */
export function feuilleProblemes(problemes: Probleme[], o: OptionsFeuille): string {
  const classes = classesFeuille(o);
  const seuls = problemes.every((p) => !p.enonce);
  const liste = (blocs: string[]) => (seuls ? `<div class="pb-grille">${blocs.join("")}</div>` : blocs.join(""));
  const titre = escapeHtml(o.titre.trim() || "Problèmes");
  return `<div class="${classes}"><header class="pb-entete"><h1>${titre}</h1>`
    + `<div class="pb-nom">Prénom : <span class="pb-ligne"></span> Date : <span class="pb-ligne pb-courte"></span></div></header>`
    + liste(problemes.map((p, i) => blocProbleme(p, i, o))) + `</div>`
    + (o.corrige
      ? `<div class="${classes} pb-corrige"><header class="pb-entete"><h1>Corrigé · ${titre}</h1></header>${liste(problemes.map(blocCorrige))}</div>`
      : "");
}

/** Styles de la feuille, pour l'impression comme pour l'aperçu. */
export const STYLE_FEUILLE = `
  .pb-feuille { color: #1c2233; }
  .pb-entete { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap;
    border-bottom: 2px solid #e3e6ef; padding-bottom: 6px; margin-bottom: 10px; }
  .pb-entete h1 { font-size: 22px; margin: 0; }
  .pb-nom { font-size: 14px; color: #444; white-space: nowrap; }
  .pb-probleme { display: flex; gap: 12px; break-inside: avoid; page-break-inside: avoid; border: 1px solid #cfd4e2;
    border-radius: 10px; padding: 12px 14px; margin: 0 0 10px; background: #fff; }
  .pb-numero { flex: none; width: 28px; height: 28px; border-radius: 50%; background: #eef0fe; color: #4338ca;
    font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; }
  .pb-contenu { flex: 1; min-width: 0; }
  .pb-enonce { font-size: 16px; line-height: 1.55; margin: 2px 0 8px; }
  .pb-grand .pb-enonce { font-size: 21px; }
  .pb-majuscules .pb-enonce { text-transform: uppercase; letter-spacing: .02em; }
  .pb-rappel { font-size: 13px; color: #555; }
  .pb-grand .pb-rappel { font-size: 13px; }
  .pb-schema svg { display: block; width: 100%; max-width: 460px; height: auto; }
  .pb-cadre { height: 150px; border: 2px dashed #b9c0d4; border-radius: 8px; color: #8a93a8; font-size: 12px; padding: 6px 10px; }
  .pb-reponse { display: grid; grid-template-columns: 1fr 1.6fr; gap: 18px; margin-top: 12px; font-size: 15px; }
  .pb-reponse > div { display: flex; align-items: flex-end; gap: 6px; white-space: nowrap; }
  .pb-ligne { display: inline-block; border-bottom: 1.5px dotted #777; height: 1.1em; vertical-align: bottom; }
  .pb-reponse .pb-ligne { flex: 1; }
  .pb-nom .pb-ligne { width: 150px; }
  .pb-nom .pb-courte { width: 90px; }
  .pb-grille { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
  .pb-seul .pb-schema svg { max-width: 100%; }
  .pb-solution { font-size: 14px; margin: 8px 0 0; }
  .pb-corrige { break-before: page; page-break-before: always; margin-top: 24px; }
`;
