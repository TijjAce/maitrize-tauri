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
//
// La présentation se règle élément par élément, jusqu'au modèle en barres
// seul : pour certains élèves, notamment autistes, chaque mot, cadre ou
// numéro superflu détourne l'attention de ce qu'il y a à voir.

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

function melanger<T>(r: () => number, liste: readonly T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

const borne = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v) || min));

/** La graine du problème n° `i` d'une feuille. */
export const graineDuProbleme = (graine: number, i: number) =>
  (Math.imul((graine >>> 0) ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(i + 1, 0xc2b2ae35)) >>> 0;

// ── Mots et nombres ────────────────────────────────────────────────────────

/** 1000 → « 1 000 », comme on l'écrit en classe. */
export const nombre = (n: number) => n.toLocaleString("fr-FR");

/** « de billes », « d'animaux ». */
export const de = (mot: string) => (/^[aeiouyàâéèêëîïôœù]/i.test(mot) ? `d'${mot}` : `de ${mot}`);

/** Un mot au singulier et au pluriel. */
type Accord = readonly [singulier: string, pluriel: string];

/** « 1 bille », « 4 billes ». */
const quantite = (n: number, [singulier, pluriel]: Accord) => `${nombre(n)} ${n === 1 ? singulier : pluriel}`;
const accorde = (n: number, [singulier, pluriel]: Accord) => (n === 1 ? singulier : pluriel);

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

/** Ce qu'on dessine dans les cases pour un élève non lecteur : des billes rouges, des pommes… */
export type FormeObjet = "bille" | "pomme" | "fleur" | "poisson" | "etoile" | "carte" | "crayon" | "livre"
  | "voiture" | "gateau" | "personne" | "animal" | "chaise" | "rond";
export interface Objet { forme: FormeObjet; couleur: string }

/** `objets` : ce que représente chaque partie (ou la part, ou la quantité comparée), dans l'ordre. */
export type Schema =
  | { forme: "parties"; tout: Case; parties: Case[]; objets?: Objet[] }
  | { forme: "parts-egales"; tout: Case; part: Case; nombre: Case; objets?: Objet[] }
  | { forme: "comparaison"; petit: Case; grand: Case; fois: number; noms: [string, string]; objets?: Objet[] };

/** Ce qui ne dépend pas des nombres : la situation racontée, les prénoms. */
export type Situation =
  | { forme: "parties"; contexte: number; categories: number[]; qui: string }
  | { forme: "parts-egales"; contexte: number; qui: string }
  | { forme: "comparaison"; objets: number; noms: [string, string] };

export interface Probleme {
  schema: Schema;
  situation: Situation;
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
  const n = borne(nombreVoulu, 1, 12);
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

interface Partie { groupe: Accord; attribut: Accord }
interface ContexteParties { tout: Accord; lieu?: string; parties: Partie[]; objet: FormeObjet }

const couleurs = (nom: Accord, adjectifs: Accord[]): Partie[] =>
  adjectifs.map(([s, p]) => ({ groupe: [`${nom[0]} ${s}`, `${nom[1]} ${p}`], attribut: [s, p] }));
const sorte = (singulier: string, pluriel: string, article: "un" | "une"): Partie =>
  ({ groupe: [singulier, pluriel], attribut: [`${article} ${singulier}`, `des ${pluriel}`] });

/** Situations : une personne possède (« Léa a… ») ou un lieu contient (« Dans le pré, il y a… »). */
export const CONTEXTES_PARTIES: ContexteParties[] = [
  { tout: ["bille", "billes"], objet: "bille", parties: couleurs(["bille", "billes"], [["rouge", "rouges"], ["bleue", "bleues"], ["verte", "vertes"]]) },
  { tout: ["crayon", "crayons"], objet: "crayon", parties: couleurs(["crayon", "crayons"], [["rouge", "rouges"], ["bleu", "bleus"], ["vert", "verts"]]) },
  { tout: ["carte", "cartes"], objet: "carte", parties: couleurs(["carte", "cartes"], [["rouge", "rouges"], ["bleue", "bleues"], ["jaune", "jaunes"]]) },
  { tout: ["voiture", "voitures"], objet: "voiture", parties: couleurs(["voiture", "voitures"], [["rouge", "rouges"], ["bleue", "bleues"], ["noire", "noires"]]) },
  { tout: ["pomme", "pommes"], lieu: "Dans le panier", objet: "pomme", parties: couleurs(["pomme", "pommes"], [["rouge", "rouges"], ["verte", "vertes"], ["jaune", "jaunes"]]) },
  { tout: ["poisson", "poissons"], lieu: "Dans l'aquarium", objet: "poisson", parties: couleurs(["poisson", "poissons"], [["rouge", "rouges"], ["jaune", "jaunes"], ["bleu", "bleus"]]) },
  { tout: ["fleur", "fleurs"], lieu: "Dans le jardin", objet: "fleur", parties: couleurs(["fleur", "fleurs"], [["rouge", "rouges"], ["jaune", "jaunes"], ["blanche", "blanches"]]) },
  { tout: ["animal", "animaux"], lieu: "Dans le pré", objet: "animal", parties: [sorte("mouton", "moutons", "un"), sorte("vache", "vaches", "une"), sorte("chèvre", "chèvres", "une")] },
  { tout: ["véhicule", "véhicules"], lieu: "Sur le parking", objet: "voiture", parties: [sorte("voiture", "voitures", "une"), sorte("camion", "camions", "un"), sorte("moto", "motos", "une")] },
  {
    tout: ["livre", "livres"], lieu: "Dans la bibliothèque de la classe", objet: "livre",
    parties: [sorte("album", "albums", "un"), sorte("bande dessinée", "bandes dessinées", "une"), sorte("documentaire", "documentaires", "un")],
  },
  {
    tout: ["gâteau", "gâteaux"], lieu: "Sur la table", objet: "gateau", parties: [
      { groupe: ["gâteau au chocolat", "gâteaux au chocolat"], attribut: ["au chocolat", "au chocolat"] },
      { groupe: ["gâteau à la fraise", "gâteaux à la fraise"], attribut: ["à la fraise", "à la fraise"] },
      { groupe: ["gâteau à la vanille", "gâteaux à la vanille"], attribut: ["à la vanille", "à la vanille"] },
    ],
  },
  { tout: ["élève", "élèves"], lieu: "Dans la classe", objet: "personne", parties: [sorte("fille", "filles", "une"), sorte("garçon", "garçons", "un")] },
  { tout: ["personne", "personnes"], lieu: "Dans le bus", objet: "personne", parties: [sorte("enfant", "enfants", "un"), sorte("adulte", "adultes", "un")] },
];

/** Couleur dessinée d'après les mots d'une partie : « rouges », « au chocolat »… */
const COULEURS_DES_MOTS: [RegExp, string][] = [
  [/rouge/, "#e53935"], [/bleu/, "#1e88e5"], [/vert/, "#43a047"], [/jaune/, "#fdd835"], [/noir/, "#455a64"],
  [/blanc/, "#ffffff"], [/chocolat/, "#6d4c41"], [/fraise/, "#f06292"], [/vanille/, "#fff3c4"],
];
/** À défaut de couleur dans les mots (moutons, vaches, chèvres), une par catégorie. */
const COULEURS_DES_SORTES = ["#8d6e63", "#fb8c00", "#7e57c2"];

function objetDeLaPartie(contexte: ContexteParties, categorie: number): Objet {
  const partie = contexte.parties[categorie % contexte.parties.length];
  const trouvee = COULEURS_DES_MOTS.find(([motif]) => motif.test(partie.attribut[1]));
  return { forme: contexte.objet, couleur: trouvee?.[1] ?? COULEURS_DES_SORTES[categorie % COULEURS_DES_SORTES.length] };
}

export type InconnuePartieTout = "tout" | "partie" | "melange";

export interface ReglagesPartieTout {
  nombre: number;
  parties: number;
  inconnue: InconnuePartieTout;
  /** Le tout ne dépasse pas ce nombre. */
  max: number;
  /** Plage personnalisée : le plus petit tout. */
  min?: number;
  /** Plage personnalisée : la plus petite partie (1 permis). */
  partMin?: number;
  enonces: boolean;
  prenoms: string[];
}

export const PLAFONDS = [10, 20, 100, 1000];

/** Le plus petit tout, la plus petite partie et le plus grand tout. */
function plage(reglages: ReglagesPartieTout, parties: number) {
  if (reglages.min !== undefined || reglages.partMin !== undefined) {
    const partMin = borne(reglages.partMin ?? 1, 1, 100000);
    const plafond = borne(reglages.max, parties * partMin, 1000000);
    return { partMin, plafond, toutMin: borne(reglages.min ?? parties * partMin, parties * partMin, plafond) };
  }
  const connues: Record<number, { toutMin: number; partMin: number }> = {
    10: { toutMin: 4, partMin: 2 },
    20: { toutMin: 11, partMin: 2 },
    100: { toutMin: 21, partMin: 10 },
    1000: { toutMin: 201, partMin: 100 },
  };
  const p = connues[reglages.max] ?? { toutMin: Math.ceil(reglages.max / 5), partMin: Math.max(2, Math.floor(reglages.max / 20)) };
  const plafond = Math.max(reglages.max, p.partMin * parties);
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
  return melanger(r, parts);
}

/**
 * Un problème partie-tout. En alternance, les problèmes pairs cherchent le
 * tout et les impairs une partie : retirer un problème garde sa nature.
 */
export function problemePartieTout(reglages: ReglagesPartieTout, graine: number, i: number): Probleme & { cle: string } {
  const r = hasard(graine);
  const combien = reglages.parties === 3 ? 3 : 2;
  const { toutMin, partMin, plafond } = plage(reglages, combien);
  const tout = entier(r, toutMin, plafond);
  const valeurs = partager(r, tout, combien, partMin);
  const cherche = reglages.inconnue === "melange" ? (i % 2 === 0 ? "tout" : "partie") : reglages.inconnue;

  const possibles = CONTEXTES_PARTIES.map((_, k) => k).filter((k) => CONTEXTES_PARTIES[k].parties.length >= combien);
  const contexte = parmi(r, possibles);
  const categories = melanger(r, CONTEXTES_PARTIES[contexte].parties.map((_, k) => k)).slice(0, combien);
  const qui = parmi(r, reglages.prenoms.length ? reglages.prenoms : PRENOMS);
  const probleme = redigerPartieTout({ forme: "parties", contexte, categories, qui }, valeurs, cherche === "tout" ? -1 : combien - 1, reglages.enonces);
  return { ...probleme, cle: `${cherche}:${tout}:${[...valeurs].sort((a, b) => a - b).join("+")}` };
}

/**
 * Rédige un problème partie-tout à partir de ses nombres. `inconnue` : -1 pour
 * le tout, sinon le rang de la partie cherchée — qui passe en dernier, dans
 * l'énoncé (« les autres ») comme sur le schéma.
 */
export function redigerPartieTout(situation: Extract<Situation, { forme: "parties" }>, valeursDonnees: number[], inconnue: number, enonces: boolean): Probleme {
  const contexte = CONTEXTES_PARTIES[situation.contexte] ?? CONTEXTES_PARTIES[0];
  let valeurs = valeursDonnees.map((v) => borne(v, 1, 1000000));
  let ordre = valeurs.map((_, k) => situation.categories[k] ?? k);
  const derniere = valeurs.length - 1;
  if (inconnue >= 0 && inconnue < derniere) {
    valeurs = [...valeurs.filter((_, k) => k !== inconnue), valeurs[inconnue]];
    ordre = [...ordre.filter((_, k) => k !== inconnue), ordre[inconnue]];
  }
  const cats = ordre.map((k) => contexte.parties[k % contexte.parties.length]);
  const tout = valeurs.reduce((s, v) => s + v, 0);
  const chercheTout = inconnue < 0;
  const qui = situation.qui;
  const personne = !contexte.lieu;
  const n = nombre;

  const schema: Schema = {
    forme: "parties",
    tout: { valeur: tout, connue: !chercheTout },
    parties: valeurs.map((v, k) => ({ valeur: v, connue: chercheTout || k < derniere })),
    objets: ordre.map((k) => objetDeLaPartie(contexte, k)),
  };
  const base = { schema, situation: { ...situation, categories: ordre } };

  if (chercheTout) {
    const liste = enumeration(valeurs.map((v, k) => quantite(v, cats[k].groupe)));
    return {
      ...base, reponse: tout,
      calcul: `${valeurs.map(n).join(" + ")} = ${n(tout)}`,
      enonce: !enonces ? "" : personne
        ? `${qui} a ${liste}. Combien ${de(contexte.tout[1])} a ${qui} en tout ?`
        : `${contexte.lieu}, il y a ${liste}. Combien y a-t-il ${de(contexte.tout[1])} en tout ?`,
      phrase: !enonces ? "" : personne
        ? `${qui} a ${quantite(tout, contexte.tout)} en tout.`
        : `Il y a ${quantite(tout, contexte.tout)} en tout.`,
    };
  }

  const cherchee = cats[derniere];
  const verbe = (v: number) => (v === 1 ? "est" : "sont");
  const connues = valeurs.slice(0, derniere).map((v, k) => (k === 0
    ? `${quantite(v, contexte.tout)} ${verbe(v)} ${accorde(v, cats[k].attribut)}`
    : `${n(v)} ${verbe(v)} ${accorde(v, cats[k].attribut)}`));
  const debut = personne ? `${qui} a ${quantite(tout, contexte.tout)}.` : `${contexte.lieu}, il y a ${quantite(tout, contexte.tout)}.`;
  return {
    ...base, reponse: valeurs[derniere],
    calcul: `${n(tout)} − ${valeurs.slice(0, derniere).map(n).join(" − ")} = ${n(valeurs[derniere])}`,
    // « les autres » reste au pluriel : l'accorder trahirait la réponse quand elle vaut 1.
    enonce: !enonces ? "" : `${debut} ${[...connues, `les autres sont ${cherchee.attribut[1]}`].join(", ")}. `
      + (personne ? `Combien ${de(cherchee.groupe[1])} a ${qui} ?` : `Combien y a-t-il ${de(cherchee.groupe[1])} ?`),
    phrase: !enonces ? "" : personne
      ? `${qui} a ${quantite(valeurs[derniere], cherchee.groupe)}.`
      : `Il y a ${quantite(valeurs[derniere], cherchee.groupe)}.`,
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
  /** Sans plage personnalisée, les deux facteurs vont de 2 à ce nombre. */
  table: number;
  /** Plage personnalisée du nombre de parts (ou du nombre de fois). */
  parts?: [number, number];
  /** Plage personnalisée de la valeur d'une part (ou de la petite quantité). */
  valeurs?: [number, number];
  enonces: boolean;
  prenoms: string[];
}

type Phrases = (qui: string, n: number, p: number, tout: number) => [string, string];
interface ContexteGroupes { plafond?: number; objet: Objet; tout: Phrases; part: Phrases; nombre: Phrases }

const CRAYON: Accord = ["crayon", "crayons"];
const BOITE: Accord = ["boîte", "boîtes"];
const BILLE: Accord = ["bille", "billes"];
const SAC: Accord = ["sac", "sacs"];
const FLEUR: Accord = ["fleur", "fleurs"];
const BOUQUET: Accord = ["bouquet", "bouquets"];
const GATEAU: Accord = ["gâteau", "gâteaux"];
const ASSIETTE: Accord = ["assiette", "assiettes"];
const IMAGE: Accord = ["image", "images"];
const PAGE: Accord = ["page", "pages"];
const ELEVE: Accord = ["élève", "élèves"];
const EQUIPE: Accord = ["équipe", "équipes"];
const CHAISE: Accord = ["chaise", "chaises"];
const TABLE: Accord = ["table", "tables"];

/** Des parts égales : chaque contexte dit les trois problèmes, énoncé puis phrase réponse. */
export const CONTEXTES_GROUPES: ContexteGroupes[] = [
  {
    objet: { forme: "crayon", couleur: "#1e88e5" },
    tout: (q, n, p, t) => [`${q} a ${quantite(n, BOITE)} de crayons. Dans chaque boîte, il y a ${quantite(p, CRAYON)}. Combien de crayons a ${q} en tout ?`, `${q} a ${quantite(t, CRAYON)} en tout.`],
    part: (q, n, p, t) => [`${q} range ${quantite(t, CRAYON)} dans ${quantite(n, BOITE)}. Chaque boîte contient le même nombre de crayons. Combien de crayons y a-t-il dans chaque boîte ?`, `Il y a ${quantite(p, CRAYON)} dans chaque boîte.`],
    nombre: (q, n, p, t) => [`${q} range ${quantite(t, CRAYON)} dans des boîtes. Chaque boîte contient ${quantite(p, CRAYON)}. Combien de boîtes remplit ${q} ?`, `${q} remplit ${quantite(n, BOITE)}.`],
  },
  {
    objet: { forme: "bille", couleur: "#e53935" },
    tout: (q, n, p, t) => [`${q} a ${quantite(n, SAC)} de billes. Dans chaque sac, il y a ${quantite(p, BILLE)}. Combien de billes a ${q} en tout ?`, `${q} a ${quantite(t, BILLE)} en tout.`],
    part: (q, n, p, t) => [`${q} met ${quantite(t, BILLE)} dans ${quantite(n, SAC)}. Chaque sac contient le même nombre de billes. Combien de billes y a-t-il dans chaque sac ?`, `Il y a ${quantite(p, BILLE)} dans chaque sac.`],
    nombre: (q, n, p, t) => [`${q} met ${quantite(t, BILLE)} dans des sacs. Chaque sac contient ${quantite(p, BILLE)}. Combien de sacs remplit ${q} ?`, `${q} remplit ${quantite(n, SAC)}.`],
  },
  {
    objet: { forme: "fleur", couleur: "#f06292" },
    tout: (q, n, p, t) => [`${q} fait ${quantite(n, BOUQUET)}. Dans chaque bouquet, il y a ${quantite(p, FLEUR)}. Combien de fleurs utilise ${q} ?`, `${q} utilise ${quantite(t, FLEUR)}.`],
    part: (q, n, p, t) => [`${q} fait ${quantite(n, BOUQUET)} avec ${quantite(t, FLEUR)}. Tous les bouquets ont le même nombre de fleurs. Combien de fleurs y a-t-il dans chaque bouquet ?`, `Il y a ${quantite(p, FLEUR)} dans chaque bouquet.`],
    nombre: (q, n, p, t) => [`Avec ${quantite(t, FLEUR)}, ${q} fait des bouquets de ${quantite(p, FLEUR)}. Combien de bouquets fait ${q} ?`, `${q} fait ${quantite(n, BOUQUET)}.`],
  },
  {
    objet: { forme: "gateau", couleur: "#6d4c41" },
    tout: (_q, n, p, t) => [`Sur la table, il y a ${quantite(n, ASSIETTE)}. Sur chaque assiette, il y a ${quantite(p, GATEAU)}. Combien y a-t-il de gâteaux en tout ?`, `Il y a ${quantite(t, GATEAU)} en tout.`],
    part: (q, n, p, t) => [`${q} pose ${quantite(t, GATEAU)} sur ${quantite(n, ASSIETTE)}. Chaque assiette a le même nombre de gâteaux. Combien de gâteaux y a-t-il sur chaque assiette ?`, `Il y a ${quantite(p, GATEAU)} sur chaque assiette.`],
    nombre: (q, n, p, t) => [`${q} pose ${quantite(t, GATEAU)} sur des assiettes, ${quantite(p, GATEAU)} par assiette. Combien d'assiettes faut-il ?`, `Il faut ${quantite(n, ASSIETTE)}.`],
  },
  {
    objet: { forme: "carte", couleur: "#fb8c00" },
    tout: (q, n, p, t) => [`${q} colle des images dans son album : ${quantite(n, PAGE)}, avec ${quantite(p, IMAGE)} sur chaque page. Combien d'images colle ${q} ?`, `${q} colle ${quantite(t, IMAGE)}.`],
    part: (q, n, p, t) => [`${q} colle ${quantite(t, IMAGE)} sur ${quantite(n, PAGE)} de son album. Chaque page a le même nombre d'images. Combien d'images y a-t-il sur chaque page ?`, `Il y a ${quantite(p, IMAGE)} sur chaque page.`],
    nombre: (q, n, p, t) => [`${q} colle ${quantite(t, IMAGE)} dans son album, ${quantite(p, IMAGE)} par page. Combien de pages remplit ${q} ?`, `${q} remplit ${quantite(n, PAGE)}.`],
  },
  {
    objet: { forme: "personne", couleur: "#7e57c2" },
    plafond: 30,
    tout: (_q, n, p, t) => [`Pour le sport, la classe fait ${quantite(n, EQUIPE)}. Dans chaque équipe, il y a ${quantite(p, ELEVE)}. Combien y a-t-il d'élèves en tout ?`, `Il y a ${quantite(t, ELEVE)} en tout.`],
    part: (_q, n, p, t) => [`Pour le sport, ${quantite(t, ELEVE)} forment ${quantite(n, EQUIPE)}. Toutes les équipes ont le même nombre d'élèves. Combien y a-t-il d'élèves dans chaque équipe ?`, `Il y a ${quantite(p, ELEVE)} dans chaque équipe.`],
    nombre: (_q, n, p, t) => [`Pour le sport, ${quantite(t, ELEVE)} forment des équipes de ${quantite(p, ELEVE)}. Combien d'équipes y a-t-il ?`, `Il y a ${quantite(n, EQUIPE)}.`],
  },
  {
    objet: { forme: "chaise", couleur: "#8d6e63" },
    plafond: 60,
    tout: (_q, n, p, t) => [`Dans la salle, il y a ${quantite(n, TABLE)}. Autour de chaque table, il y a ${quantite(p, CHAISE)}. Combien y a-t-il de chaises en tout ?`, `Il y a ${quantite(t, CHAISE)} en tout.`],
    part: (_q, n, p, t) => [`Dans la salle, ${quantite(t, CHAISE)} sont placées autour de ${quantite(n, TABLE)}, le même nombre autour de chaque table. Combien y a-t-il de chaises autour de chaque table ?`, `Il y a ${quantite(p, CHAISE)} autour de chaque table.`],
    nombre: (_q, n, p, t) => [`Dans la salle, on place ${quantite(p, CHAISE)} autour de chaque table. Il y a ${quantite(t, CHAISE)}. Combien de tables faut-il ?`, `Il faut ${quantite(n, TABLE)}.`],
  },
];

/** Ce qu'on dessine pour chaque objet comparé, dans le même ordre. */
export const OBJETS_COMPARES_DESSINES: Objet[] = [
  { forme: "bille", couleur: "#e53935" }, { forme: "carte", couleur: "#fb8c00" }, { forme: "carte", couleur: "#1e88e5" },
  { forme: "livre", couleur: "#43a047" }, { forme: "etoile", couleur: "#fdd835" }, { forme: "carte", couleur: "#7e57c2" },
  { forme: "rond", couleur: "#f06292" },
];

/** Ce qu'on compare. */
export const OBJETS_COMPARES: Accord[] = [
  ["bille", "billes"], ["image", "images"], ["carte", "cartes"], ["livre", "livres"],
  ["point", "points"], ["timbre", "timbres"], ["coquillage", "coquillages"],
];

/** Une plage [min, max] rangée dans l'ordre, au moins `plancher`. */
function plageDe(couple: [number, number] | undefined, plancher: number, defaut: [number, number]): [number, number] {
  if (!couple) return defaut;
  const a = borne(couple[0], plancher, 10000);
  const b = borne(couple[1], plancher, 10000);
  return [Math.min(a, b), Math.max(a, b)];
}

export function problemeMultiplicatif(reglages: ReglagesMultiplicatifs, graine: number, i: number): Probleme & { cle: string } {
  const r = hasard(graine);
  const types = reglages.types.length ? reglages.types : (["tout"] as TypeMultiplicatif[]);
  const type = types[i % types.length];
  const table = borne(reglages.table, 2, 10);
  // Une seule part, ou « 1 fois plus », ne fait pas un problème : deux au moins.
  const [nMin, nMax] = plageDe(reglages.parts, 2, [2, table]);
  const [vMin, vMax] = plageDe(reglages.valeurs, 1, [2, table]);
  const prenoms = reglages.prenoms.length ? reglages.prenoms : PRENOMS;
  const qui = parmi(r, prenoms);

  if (type === "grand" || type === "petit") {
    const petit = entier(r, vMin, vMax);
    const fois = entier(r, nMin, nMax);
    const autres = prenoms.filter((p) => p !== qui);
    const autre = parmi(r, autres.length ? autres : PRENOMS.filter((p) => p !== qui));
    const objets = Math.floor(r() * OBJETS_COMPARES.length);
    const probleme = redigerMultiplicatif({ forme: "comparaison", objets, noms: [qui, autre] }, type, fois, petit, reglages.enonces);
    return { ...probleme, cle: `${type}:${petit}x${fois}` };
  }

  const parts = entier(r, nMin, nMax);
  const part = entier(r, vMin, vMax);
  const possibles = CONTEXTES_GROUPES.map((_, k) => k).filter((k) => !CONTEXTES_GROUPES[k].plafond || parts * part <= CONTEXTES_GROUPES[k].plafond!);
  const contexte = parmi(r, possibles);
  const probleme = redigerMultiplicatif({ forme: "parts-egales", contexte, qui }, type, parts, part, reglages.enonces);
  return { ...probleme, cle: `${type}:${parts}x${part}` };
}

/**
 * Rédige un problème multiplicatif. Parts égales : `fois` parts de `valeur`.
 * Comparaison : la grande quantité vaut `fois` fois la petite, `valeur`.
 */
export function redigerMultiplicatif(situation: Extract<Situation, { forme: "parts-egales" | "comparaison" }>,
  typeDemande: TypeMultiplicatif, foisDonne: number, valeurDonnee: number, enonces: boolean): Probleme {
  const n = nombre;
  const fois = borne(foisDonne, 2, 10000);
  const valeur = borne(valeurDonnee, 1, 10000);

  if (situation.forme === "comparaison") {
    const type = typeDemande === "petit" ? "petit" : "grand";
    const objets = OBJETS_COMPARES[situation.objets] ?? OBJETS_COMPARES[0];
    const [a, b] = situation.noms;
    const grand = valeur * fois;
    const schema: Schema = {
      forme: "comparaison", fois,
      petit: { valeur, connue: type === "grand" },
      grand: { valeur: grand, connue: type === "petit" },
      noms: enonces ? [a, b] : ["A", "B"],
      objets: [OBJETS_COMPARES_DESSINES[situation.objets] ?? OBJETS_COMPARES_DESSINES[0]],
    };
    if (type === "grand") {
      return {
        schema, situation, reponse: grand, calcul: `${n(valeur)} × ${n(fois)} = ${n(grand)}`,
        enonce: enonces ? `${a} a ${quantite(valeur, objets)}. ${b} a ${n(fois)} fois plus ${de(objets[1])} que ${a}. Combien ${de(objets[1])} a ${b} ?` : "",
        phrase: enonces ? `${b} a ${quantite(grand, objets)}.` : "",
      };
    }
    return {
      schema, situation, reponse: valeur, calcul: `${n(grand)} : ${n(fois)} = ${n(valeur)}`,
      enonce: enonces ? `${b} a ${quantite(grand, objets)}. C'est ${n(fois)} fois plus que ${a}. Combien ${de(objets[1])} a ${a} ?` : "",
      phrase: enonces ? `${a} a ${quantite(valeur, objets)}.` : "",
    };
  }

  const type = typeDemande === "part" || typeDemande === "nombre" ? typeDemande : "tout";
  const tout = fois * valeur;
  const schema: Schema = {
    forme: "parts-egales",
    tout: { valeur: tout, connue: type !== "tout" },
    part: { valeur, connue: type !== "part" },
    nombre: { valeur: fois, connue: type !== "nombre" },
  };
  const contexte = CONTEXTES_GROUPES[situation.contexte] ?? CONTEXTES_GROUPES[0];
  schema.objets = [contexte.objet];
  const [enonce, phrase] = contexte[type](situation.qui, fois, valeur, tout);
  return {
    schema, situation,
    calcul: type === "tout" ? `${n(fois)} × ${n(valeur)} = ${n(tout)}`
      : type === "part" ? `${n(tout)} : ${n(fois)} = ${n(valeur)}`
      : `${n(tout)} : ${n(valeur)} = ${n(fois)}`,
    reponse: type === "tout" ? tout : type === "part" ? valeur : fois,
    enonce: enonces ? enonce : "",
    phrase: enonces ? phrase : "",
  };
}

export function genererMultiplicatifs(reglages: ReglagesMultiplicatifs, graine: number, retirages: Record<number, number> = {}): Probleme[] {
  return feuille(reglages.nombre, graine, retirages, (g, i) => {
    const { cle, ...probleme } = problemeMultiplicatif(reglages, g, i);
    return { probleme, cle };
  });
}

// ── Retouches : l'enseignant choisit lui-même les nombres ──────────────────

export type Retouche =
  | { forme: "parties"; valeurs: number[]; inconnue: number }
  | { forme: "parts-egales"; type: "tout" | "part" | "nombre"; parts: number; valeur: number }
  | { forme: "comparaison"; type: "grand" | "petit"; petit: number; fois: number };

/** Ce qu'un problème est, sous la forme que l'éditeur modifie. */
export function retoucheDe(p: Probleme): Retouche {
  const s = p.schema;
  switch (s.forme) {
    case "parties":
      return { forme: "parties", valeurs: s.parties.map((c) => c.valeur), inconnue: s.tout.connue ? s.parties.findIndex((c) => !c.connue) : -1 };
    case "parts-egales":
      return { forme: "parts-egales", type: !s.tout.connue ? "tout" : !s.part.connue ? "part" : "nombre", parts: s.nombre.valeur, valeur: s.part.valeur };
    case "comparaison":
      return { forme: "comparaison", type: s.petit.connue ? "grand" : "petit", petit: s.petit.valeur, fois: s.fois };
  }
}

/** Le problème avec les nombres choisis : l'énoncé est réécrit, la situation gardée. */
export function retoucher(p: Probleme, r: Retouche, enonces: boolean): Probleme {
  const sit = p.situation;
  if (r.forme === "parties" && sit.forme === "parties") return redigerPartieTout(sit, r.valeurs, r.inconnue, enonces);
  if (r.forme === "parts-egales" && sit.forme === "parts-egales") return redigerMultiplicatif(sit, r.type, r.parts, r.valeur, enonces);
  if (r.forme === "comparaison" && sit.forme === "comparaison") return redigerMultiplicatif(sit, r.type, r.fois, r.petit, enonces);
  return p;
}

// ── Présentation ───────────────────────────────────────────────────────────

export type TailleTexte = "normale" | "grande" | "tres-grande";
export type Police = "arial" | "verdana" | "comic";
export type ContenuSchema = "nombres" | "vide" | "sans";
export type MarqueInconnue = "?" | "vide" | "surlignee";
export type Palette = "classe" | "noir" | "perso";
export type Epaisseur = "fin" | "normal" | "epais";
export type TailleSchema = "moyen" | "grand" | "pleine";
/** Dans les cases : les nombres, des objets dessinés, ou les deux. */
export type ImagesCases = "non" | "oui" | "avec-nombres";
export type FormeImages = "enonce" | "ronds";

/** Tout ce qui paraît sur la feuille, élément par élément. */
export interface Presentation {
  // La feuille
  titre: boolean;
  nomDate: boolean;
  numeros: boolean;
  cadres: boolean;
  /** 0 : les problèmes se suivent ; sinon, tant par page. */
  parPage: number;
  colonnes: number;
  police: Police;
  corrige: boolean;
  // L'énoncé
  enonce: boolean;
  tailleTexte: TailleTexte;
  capitales: boolean;
  calcul: boolean;
  reponse: boolean;
  // Le schéma
  /** Avec un énoncé : nombres donnés, cases vides à compléter, ou cadre pour dessiner. */
  schema: ContenuSchema;
  inconnue: MarqueInconnue;
  etiquettes: boolean;
  motTout: string;
  motPartie: string;
  aides: boolean;
  couleurs: Palette;
  couleurTout: string;
  couleurPartie1: string;
  couleurPartie2: string;
  couleurPartie3: string;
  proportionnel: boolean;
  toutEnBas: boolean;
  epaisseur: Epaisseur;
  tailleSchema: TailleSchema;
  images: ImagesCases;
  formeImages: FormeImages;
}

const BLEU = "#2438d6";
const BLEU_FONCE = "#1a1f73";
const ROUGE = "#d33a32";
const PRUNE = "#a23b6b";
const VERT_PARTIE = "#2f855a";

export const PRESENTATION_COMPLETE: Presentation = {
  titre: true, nomDate: true, numeros: true, cadres: true, parPage: 0, colonnes: 1, police: "arial", corrige: true,
  enonce: true, tailleTexte: "normale", capitales: false, calcul: true, reponse: true,
  schema: "nombres", inconnue: "?", etiquettes: true, motTout: "TOUT", motPartie: "PARTIE", aides: true,
  couleurs: "classe", couleurTout: BLEU, couleurPartie1: ROUGE, couleurPartie2: PRUNE, couleurPartie3: VERT_PARTIE,
  proportionnel: true, toutEnBas: false, epaisseur: "normal", tailleSchema: "moyen",
  images: "non", formeImages: "enonce",
};

/** Le modèle en barres et ses nombres, rien d'autre. */
export const PRESENTATION_MODELE_SEUL: Presentation = {
  ...PRESENTATION_COMPLETE,
  titre: false, nomDate: false, numeros: false, cadres: false,
  enonce: false, calcul: false, reponse: false, etiquettes: false, aides: false, tailleSchema: "grand",
};

const CHOIX: Partial<Record<keyof Presentation, readonly unknown[]>> = {
  parPage: [0, 1, 2, 3, 4, 6],
  colonnes: [1, 2],
  police: ["arial", "verdana", "comic"],
  tailleTexte: ["normale", "grande", "tres-grande"],
  schema: ["nombres", "vide", "sans"],
  inconnue: ["?", "vide", "surlignee"],
  couleurs: ["classe", "noir", "perso"],
  epaisseur: ["fin", "normal", "epais"],
  tailleSchema: ["moyen", "grand", "pleine"],
  images: ["non", "oui", "avec-nombres"],
  formeImages: ["enonce", "ronds"],
};

/** Une présentation lue d'ailleurs (réglages, ancienne version) : ce qui est invalide reprend sa valeur par défaut. */
export function normaliserPresentation(brut: unknown): Presentation {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const sortie = { ...PRESENTATION_COMPLETE } as Record<string, unknown>;
  for (const [cle, defaut] of Object.entries(PRESENTATION_COMPLETE)) {
    const v = o[cle];
    const choix = CHOIX[cle as keyof Presentation];
    if (choix) sortie[cle] = choix.includes(v) ? v : defaut;
    else if (/^couleur(Tout|Partie\d)$/.test(cle)) sortie[cle] = typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : defaut;
    else if (typeof defaut === "boolean") sortie[cle] = typeof v === "boolean" ? v : defaut;
    else if (typeof defaut === "string") sortie[cle] = typeof v === "string" ? v.slice(0, 30) : defaut;
  }
  return sortie as unknown as Presentation;
}

export const memePresentation = (a: Presentation, b: Presentation) =>
  (Object.keys(PRESENTATION_COMPLETE) as (keyof Presentation)[]).every((k) => a[k] === b[k]);

// ── Schémas ────────────────────────────────────────────────────────────────

/** `nombres` : l'élève voit les nombres donnés ; `vide` : il remplit tout ; `corrige` : tout est rempli. */
export type ModeSchema = "nombres" | "vide" | "corrige";

/** Ce qui règle le dessin d'un schéma. */
export interface StyleSchema {
  etiquettes: boolean;
  motTout: string;
  motPartie: string;
  aides: boolean;
  inconnue: MarqueInconnue;
  trait: string;
  encreTout: string;
  parties: [string, string, string];
  proportionnel: boolean;
  toutEnBas: boolean;
  epaisseur: number;
  police: string;
  images: ImagesCases;
  /** Des ronds de couleur plutôt que les objets de l'énoncé. */
  ronds: boolean;
}

const POLICES: Record<Police, string> = {
  arial: "Arial, Helvetica, sans-serif",
  verdana: "Verdana, Geneva, sans-serif",
  comic: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', sans-serif",
};

export function styleSchema(p: Presentation): StyleSchema {
  const noir = "#111111";
  const palette = p.couleurs === "noir"
    ? { trait: noir, encreTout: noir, parties: [noir, noir, noir] as [string, string, string] }
    : p.couleurs === "perso"
      ? { trait: p.couleurTout, encreTout: p.couleurTout, parties: [p.couleurPartie1, p.couleurPartie2, p.couleurPartie3] as [string, string, string] }
      : { trait: BLEU, encreTout: BLEU_FONCE, parties: [ROUGE, PRUNE, VERT_PARTIE] as [string, string, string] };
  return {
    ...palette,
    etiquettes: p.etiquettes, motTout: p.motTout.trim(), motPartie: p.motPartie.trim(), aides: p.aides,
    inconnue: p.inconnue, proportionnel: p.proportionnel, toutEnBas: p.toutEnBas,
    epaisseur: { fin: 2, normal: 3, epais: 5 }[p.epaisseur], police: POLICES[p.police],
    images: p.images, ronds: p.formeImages === "ronds",
  };
}

export const STYLE_CLASSE = styleSchema(PRESENTATION_COMPLETE);

const VERT = "#15803d";
const VERT_FOND = "#e6f6ec";
const JAUNE = "#fff1a6";
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

// ── Objets dessinés dans les cases ──
//
// Pour un élève qui ne lit pas encore les nombres : 8 billes rouges dans la
// case de 8. Au-delà de LIMITE_OBJETS, ou dans une case trop étroite, le
// nombre reste écrit — des objets minuscules ne se comptent pas.

export const LIMITE_OBJETS = 20;
const GRIS_OBJET = "#9e9e9e";

/** Le dessin d'un objet, dans un carré de 20 × 20. */
function traceObjet(forme: FormeObjet, c: string): string {
  const t = `stroke="#3a3a3a" stroke-width="1" stroke-linejoin="round"`;
  switch (forme) {
    case "bille":
      return `<circle cx="10" cy="10" r="8" fill="${c}" ${t}/><circle cx="7.2" cy="7" r="2.3" fill="#fff" opacity=".55"/>`;
    case "pomme":
      return `<path d="M10 6.5C6.2 3.5 2 6 2.6 11.2 3.2 16 7 19 10 17.2 13 19 16.8 16 17.4 11.2 18 6 13.8 3.5 10 6.5Z" fill="${c}" ${t}/>`
        + `<path d="M10 6.3C10 4.2 10.8 2.8 12.2 2.1" fill="none" stroke="#5d4037" stroke-width="1.4" stroke-linecap="round"/>`
        + `<path d="M11 4.2C12.8 2.2 15.4 2.4 16.2 3.4 14.4 5.2 12.6 5.3 11 4.2Z" fill="#43a047"/>`;
    case "fleur":
      return [[10, 4.8], [15, 8.4], [13.1, 14.3], [6.9, 14.3], [5, 8.4]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.7" fill="${c}" ${t}/>`).join("")
        + `<circle cx="10" cy="10" r="2.9" fill="#fdd835" ${t}/>`;
    case "poisson":
      return `<path d="M13.6 10 18.6 5.8V14.2Z" fill="${c}" ${t}/><path d="M1.6 10C4.4 4.6 10.6 4.4 14.6 10 10.6 15.6 4.4 15.4 1.6 10Z" fill="${c}" ${t}/>`
        + `<circle cx="5.4" cy="9" r="1.1" fill="#3a3a3a"/>`;
    case "etoile":
      return `<path d="M10 1.6 12.5 7.1 18.4 7.6 13.9 11.6 15.3 17.6 10 14.5 4.7 17.6 6.1 11.6 1.6 7.6 7.5 7.1Z" fill="${c}" ${t}/>`;
    case "carte":
      return `<rect x="4.2" y="2.4" width="11.6" height="15.2" rx="1.8" fill="${c}" ${t}/><rect x="6.4" y="4.8" width="7.2" height="10.4" rx="1" fill="#fff" opacity=".35"/>`;
    case "crayon":
      return `<path d="M5.5 16.8 3.4 17.6 4.2 15.4 13.8 5.8 15.2 7.2Z" fill="#f5deb3" ${t}/><path d="M6.6 14.8 14.2 4.2 17.2 7.2 7.8 16.6Z" fill="${c}" ${t}/>`;
    case "livre":
      return `<rect x="3.6" y="2.8" width="12.8" height="14.4" rx="1.2" fill="${c}" ${t}/><path d="M6.4 2.8V17.2" stroke="#fff" stroke-width="1.3" opacity=".6"/>`;
    case "voiture":
      return `<path d="M1.8 13 3.6 8.6C4.2 7.2 5.2 6.6 6.8 6.6H13.2C14.8 6.6 15.8 7.2 16.4 8.6L18.2 13V15.6H1.8Z" fill="${c}" ${t}/>`
        + `<rect x="5.6" y="8.2" width="8.8" height="3" rx=".8" fill="#fff" opacity=".6"/>`
        + `<circle cx="5.8" cy="15.6" r="2.2" fill="#3a3a3a"/><circle cx="14.2" cy="15.6" r="2.2" fill="#3a3a3a"/>`;
    case "gateau":
      return `<path d="M3 10.6H17V17.2H3Z" fill="${c}" ${t}/><path d="M3 10.8Q5 8 7 10.8 9 8 11 10.8 13 8 15 10.8 16 9.2 17 10.8" fill="#fff" ${t}/>`
        + `<circle cx="10" cy="6.2" r="2.1" fill="#e53935" ${t}/>`;
    case "personne":
      return `<circle cx="10" cy="5.4" r="3.4" fill="${c}" ${t}/><path d="M3.8 18.4C3.8 12.8 6.4 10 10 10S16.2 12.8 16.2 18.4Z" fill="${c}" ${t}/>`;
    case "animal":
      return `<ellipse cx="9.4" cy="11" rx="6.8" ry="4.6" fill="${c}" ${t}/><circle cx="16" cy="8.2" r="2.8" fill="${c}" ${t}/>`
        + `<path d="M5 15V18.4M8.2 15.4V18.4M11.4 15.4V18.4M14.2 14.6V18.4" stroke="#3a3a3a" stroke-width="1.5" stroke-linecap="round"/>`;
    case "chaise":
      return `<path d="M5 2.8H8V10H15V13H8V18H5Z" fill="${c}" ${t}/><path d="M13 13V18" stroke="#3a3a3a" stroke-width="2" stroke-linecap="round"/>`;
    default:
      return `<circle cx="10" cy="10" r="8" fill="${c}" ${t}/>`;
  }
}

/** Le meilleur rangement de `n` objets dans une case : lignes, colonnes, taille. */
export function rangementObjets(n: number, l: number, h: number): { lignes: number; colonnes: number; cote: number } | null {
  if (n <= 0 || n > LIMITE_OBJETS) return null;
  let meilleur: { lignes: number; colonnes: number; cote: number } | null = null;
  for (let lignes = 1; lignes <= 4; lignes++) {
    const colonnes = Math.ceil(n / lignes);
    if (colonnes * (lignes - 1) >= n) continue; // une ligne vide
    const cote = Math.min((l - 8) / colonnes, (h - 6) / lignes);
    if (!meilleur || cote > meilleur.cote) meilleur = { lignes, colonnes, cote };
  }
  return meilleur && meilleur.cote >= 11 ? meilleur : null;
}

/** Des objets rangés dans une case, groupe après groupe (8 rouges puis 4 bleus). */
function objetsDansLaCase(x: number, y: number, l: number, h: number, groupes: { objet: Objet; n: number }[], st: StyleSchema): string | null {
  const total = groupes.reduce((s, g) => s + g.n, 0);
  const r = rangementObjets(total, l, h);
  if (!r) return null;
  const x0 = x + (l - r.colonnes * r.cote) / 2;
  const y0 = y + (h - r.lignes * r.cote) / 2;
  const taille = r.cote * 0.88;
  let k = 0, sortie = "";
  for (const g of groupes) {
    const forme = st.ronds ? "rond" : g.objet.forme;
    for (let i = 0; i < g.n; i++, k++) {
      const cx = x0 + (k % r.colonnes) * r.cote + r.cote / 2;
      const cy = y0 + Math.floor(k / r.colonnes) * r.cote + r.cote / 2;
      sortie += `<g class="pb-objet" transform="translate(${arrondi(cx - taille / 2)} ${arrondi(cy - taille / 2)}) scale(${arrondi(taille / 20 * 100) / 100})">`
        + `${traceObjet(forme, escapeHtml(g.objet.couleur))}</g>`;
    }
  }
  return sortie;
}

/** Ce qu'affiche une case, selon le mode et la marque choisie pour la case à trouver. */
function contenu(c: Case, mode: ModeSchema, st: StyleSchema): { texte: string; fond?: string; encre?: string; gras?: boolean } {
  if (mode === "corrige") return c.connue ? { texte: nombre(c.valeur) } : { texte: nombre(c.valeur), fond: VERT_FOND, encre: VERT, gras: true };
  const fond = !c.connue && st.inconnue === "surlignee" ? JAUNE : undefined;
  if (mode === "vide") return { texte: "", fond };
  if (c.connue) return { texte: nombre(c.valeur) };
  return { texte: st.inconnue === "?" ? "?" : "", fond };
}

function texte(x: number, y: number, valeur: string, taille: number, couleur: string, st: StyleSchema, extra = ""): string {
  return `<text x="${arrondi(x)}" y="${arrondi(y)}" text-anchor="middle" dominant-baseline="central" font-family="${escapeHtml(st.police)}" `
    + `font-size="${arrondi(taille)}" fill="${escapeHtml(couleur)}"${extra}>${escapeHtml(valeur)}</text>`;
}

/**
 * Une case : son cadre et, selon le mode, son nombre, « ? » ou rien. Avec des
 * `objets`, une valeur visible se dessine en objets à compter.
 */
function boite(x: number, y: number, l: number, h: number, trait: string, c: Case | null, mode: ModeSchema, st: StyleSchema,
  { taille = 30, encre = trait, pointille = false, objets }: {
    taille?: number; encre?: string; pointille?: boolean; objets?: { objet: Objet; n: number }[];
  } = {}): string {
  const vu = c ? contenu(c, mode, st) : { texte: "" };
  const cadre = `<rect x="${arrondi(x)}" y="${arrondi(y)}" width="${arrondi(l)}" height="${h}" fill="${vu.fond ?? "#fff"}" `
    + `stroke="${escapeHtml(trait)}" stroke-width="${st.epaisseur}"${pointille ? ' stroke-dasharray="8 6"' : ""}/>`;
  if (!vu.texte) return cadre;
  const visible = !!c && (mode === "corrige" || c.connue);
  if (visible && objets && st.images !== "non") {
    const avecNombre = st.images === "avec-nombres";
    const dessin = objetsDansLaCase(x, y, avecNombre ? l - 26 : l, h, objets, st);
    if (dessin) {
      if (!avecNombre) return cadre + dessin;
      const pastille = `<circle cx="${arrondi(x + l - 14)}" cy="${arrondi(y + 14)}" r="11" fill="${vu.fond ?? "#fff"}" stroke="${escapeHtml(vu.encre ?? encre)}" stroke-width="1.5"/>`
        + texte(x + l - 14, y + 15, vu.texte, vu.texte.length > 1 ? 11 : 13, vu.encre ?? encre, st, ' font-weight="700"');
      return cadre + dessin + pastille;
    }
  }
  const place = Math.min(taille, (l - 10) / Math.max(1, vu.texte.length * 0.58));
  return cadre + texte(x + l / 2, y + h / 2 + 1, vu.texte, place, vu.encre ?? encre, st, vu.gras ? ' font-weight="700"' : "");
}

function etiquette(x: number, y: number, valeur: string, taille: number, st: StyleSchema, couleur = "#222"): string {
  return texte(x, y, valeur, taille, couleur, st, ' font-weight="600" letter-spacing="1"');
}

/** Taille d'un mot pour qu'il tienne dans `largeur`. */
const tailleMot = (mot: string, largeur: number, maxi = 18) => Math.max(9, Math.min(maxi, (largeur - 6) / Math.max(1, mot.length * 0.68)));

/** Accolade à plat, sous une rangée (ou au-dessus). */
const accolade = (x1: number, x2: number, y: number, versLeBas: boolean) => {
  const s = versLeBas ? 1 : -1;
  return `<path d="M ${arrondi(x1 + 2)} ${y} v ${8 * s} H ${arrondi(x2 - 2)} v ${-8 * s} M ${arrondi((x1 + x2) / 2)} ${y + 8 * s} v ${7 * s}" fill="none" stroke="#555" stroke-width="2"/>`;
};

const svg = (hauteur: number, corps: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${Math.ceil(hauteur)}" role="img" aria-label="Schéma en barres">${corps}</svg>`;

function schemaParties(s: Extract<Schema, { forme: "parties" }>, mode: ModeSchema, st: StyleSchema): string {
  const x0 = 10, l = LARGEUR - 20, h = 56, ecart = 16;
  const marge = st.etiquettes && (st.motTout || st.motPartie) ? 32 : 6;
  const yHaut = marge, yBas = marge + h + ecart;
  const yTout = st.toutEnBas ? yBas : yHaut;
  const yParties = st.toutEnBas ? yHaut : yBas;
  const valeurs = s.parties.map((p) => p.valeur);
  const tailles = st.proportionnel ? largeurs(valeurs, l, 70) : valeurs.map(() => l / valeurs.length);
  const objet = (k: number): Objet => s.objets?.[k] ?? { forme: "rond", couleur: st.parties[k % 3] };
  // Dans le tout, les objets de chaque partie à la suite. Tant qu'une partie
  // est à trouver, ils sont gris : leurs couleurs donneraient la réponse à compter.
  const partieCachee = mode !== "corrige" && s.parties.some((p) => !p.connue);
  const objetsDuTout = s.parties.map((p, k) => ({
    objet: partieCachee ? { forme: objet(0).forme, couleur: GRIS_OBJET } : objet(k), n: p.valeur,
  }));
  let corps = boite(x0, yTout, l, h, st.trait, s.tout, mode, st, { taille: 32, encre: st.encreTout, objets: objetsDuTout });
  if (st.etiquettes && st.motTout) corps += etiquette(LARGEUR / 2, st.toutEnBas ? yTout + h + 17 : yTout - 16, st.motTout, tailleMot(st.motTout, l), st);
  let x = x0;
  s.parties.forEach((p, k) => {
    corps += boite(x, yParties, tailles[k], h, st.parties[k % 3], p, mode, st, { objets: [{ objet: objet(k), n: p.valeur }] });
    if (st.etiquettes && st.motPartie) {
      corps += etiquette(x + tailles[k] / 2, st.toutEnBas ? yParties - 16 : yParties + h + 17, st.motPartie, tailleMot(st.motPartie, tailles[k]), st);
    }
    x += tailles[k];
  });
  return svg(yBas + h + marge, corps);
}

function schemaPartsEgales(s: Extract<Schema, { forme: "parts-egales" }>, mode: ModeSchema, st: StyleSchema): string {
  const x0 = 10, l = LARGEUR - 20, h = 56, ecart = 16;
  const couleur = st.parties[0];
  const objet: Objet = s.objets?.[0] ?? { forme: "rond", couleur };
  const dansUnePart = [{ objet, n: s.part.valeur }];
  const margeTout = st.etiquettes && st.motTout ? 32 : 6;
  const margeAide = st.aides ? 50 : 6;
  const yPremier = st.toutEnBas ? margeAide : margeTout;
  const yTout = st.toutEnBas ? yPremier + h + ecart : yPremier;
  const yParts = st.toutEnBas ? yPremier : yPremier + h + ecart;
  const hauteur = yPremier + 2 * h + ecart + (st.toutEnBas ? margeTout : margeAide);

  let corps = boite(x0, yTout, l, h, st.trait, s.tout, mode, st, { taille: 32, encre: st.encreTout, objets: [{ objet, n: s.tout.valeur }] });
  if (st.etiquettes && st.motTout) corps += etiquette(LARGEUR / 2, st.toutEnBas ? yTout + h + 17 : yTout - 16, st.motTout, tailleMot(st.motTout, l), st);

  const nombreVisible = s.nombre.connue || mode === "corrige";
  if (nombreVisible) {
    const largeur = l / s.nombre.valeur;
    for (let k = 0; k < s.nombre.valeur; k++) {
      // La valeur cherchée n'est marquée que dans la première part : une
      // rangée de « ? » se lirait comme autant de nombres différents.
      const montree = s.part.connue || mode === "corrige" || k === 0 ? s.part : null;
      corps += boite(x0 + k * largeur, yParts, largeur, h, couleur, montree, mode, st, { taille: 28, objets: dansUnePart });
    }
  } else {
    // Nombre de parts inconnu : deux parts, puis la suite en pointillés. Les
    // dessiner toutes donnerait la réponse à compter.
    const largeur = Math.min((l * s.part.valeur) / Math.max(1, s.tout.valeur), l / 3);
    corps += boite(x0, yParts, largeur, h, couleur, s.part, mode, st, { taille: 28, objets: dansUnePart })
      + boite(x0 + largeur, yParts, largeur, h, couleur, s.part, mode, st, { taille: 28, objets: dansUnePart })
      + boite(x0 + 2 * largeur, yParts, l - 2 * largeur, h, couleur, null, mode, st, { pointille: true })
      + texte(x0 + 2 * largeur + (l - 2 * largeur) / 2, yParts + h / 2, "…", 30, couleur, st);
  }

  if (st.aides) {
    const yAccolade = st.toutEnBas ? yParts - 6 : yParts + h + 6;
    const yLegende = st.toutEnBas ? yParts - 34 : yParts + h + 34;
    corps += accolade(x0, x0 + l, yAccolade, !st.toutEnBas);
    const mots = st.etiquettes ? " PARTS ÉGALES" : "";
    const cherche = !s.nombre.connue && mode !== "corrige";
    const marque = mode === "vide" || (cherche && st.inconnue !== "?")
      ? null
      : cherche ? "?" : nombre(s.nombre.valeur);
    const trouvee = mode === "corrige" && !s.nombre.connue;
    if (marque !== null) {
      corps += etiquette(LARGEUR / 2, yLegende, `${marque}${mots}`, 18, st, trouvee ? VERT : "#222");
    } else {
      // Une petite case à remplir à la place du nombre.
      const largeurMots = mots.length * 18 * 0.62;
      const debut = LARGEUR / 2 - (46 + largeurMots) / 2;
      const fond = cherche && st.inconnue === "surlignee" ? JAUNE : "#fff";
      corps += `<rect x="${arrondi(debut)}" y="${yLegende - 14}" width="40" height="28" fill="${fond}" stroke="#555" stroke-width="2"/>`;
      if (mots) corps += `<text x="${arrondi(debut + 46)}" y="${yLegende}" dominant-baseline="central" font-family="${escapeHtml(st.police)}" font-size="18" font-weight="600" letter-spacing="1" fill="#222">${escapeHtml(mots.trim())}</text>`;
    }
  }
  return svg(hauteur, corps);
}

function schemaComparaison(s: Extract<Schema, { forme: "comparaison" }>, mode: ModeSchema, st: StyleSchema): string {
  const xBarres = st.etiquettes ? 112 : 10;
  const place = (st.etiquettes ? 400 : 500) - (st.aides ? 70 : 0);
  const unite = Math.min(90, place / s.fois);
  const h = 48, y1 = 12, y2 = 82;
  const nom = (y: number, valeur: string) =>
    `<text x="10" y="${y}" dominant-baseline="central" font-family="${escapeHtml(st.police)}" font-size="18" font-weight="700" fill="#222"`
    + `${valeur.length > 8 ? ' textLength="92" lengthAdjust="spacingAndGlyphs"' : ""}>${escapeHtml(valeur)}</text>`;
  const objet: Objet = s.objets?.[0] ?? { forme: "rond", couleur: st.parties[0] };
  const dansLePetit = [{ objet, n: s.petit.valeur }];
  let corps = boite(xBarres, y1, unite, h, st.parties[0], s.petit, mode, st, { taille: 26, objets: dansLePetit });
  // Chaque morceau de la grande barre vaut la petite : ses objets s'y
  // dessinent aussi, sauf si la petite quantité est justement à trouver.
  const petitVisible = mode === "corrige" || s.petit.connue;
  for (let k = 0; k < s.fois; k++) {
    const dessin = st.images !== "non" && petitVisible
      ? objetsDansLaCase(xBarres + k * unite, y2, unite, h, dansLePetit, st) : null;
    corps += boite(xBarres + k * unite, y2, unite, h, st.parties[1], null, mode, st) + (dessin ?? "");
  }
  if (st.etiquettes) corps += nom(y1 + h / 2, s.noms[0]) + nom(y2 + h / 2, s.noms[1]);
  const fin = xBarres + s.fois * unite;
  // L'accolade et la grande quantité restent toujours : sans elles, le schéma
  // ne dit plus ce que vaut la barre du bas.
  corps += accolade(xBarres, fin, y2 + h + 8, true);
  const total = contenu(s.grand, mode, st);
  const yTotal = y2 + h + 36;
  if (total.texte) {
    corps += texte((xBarres + fin) / 2, yTotal, total.texte, 24, total.encre ?? st.parties[1], st, total.gras ? ' font-weight="700"' : "");
  } else {
    corps += `<rect x="${arrondi((xBarres + fin) / 2 - 30)}" y="${yTotal - 15}" width="60" height="30" fill="${total.fond ?? "#fff"}" stroke="#555" stroke-width="2"/>`;
  }
  if (st.aides && mode !== "vide") corps += texte(fin + 34, y2 + h / 2, `× ${nombre(s.fois)}`, 22, st.parties[1], st, ' font-weight="600"');
  return svg(yTotal + 22, corps);
}

export function schemaSvg(s: Schema, mode: ModeSchema, st: StyleSchema = STYLE_CLASSE): string {
  switch (s.forme) {
    case "parties": return schemaParties(s, mode, st);
    case "parts-egales": return schemaPartsEgales(s, mode, st);
    case "comparaison": return schemaComparaison(s, mode, st);
  }
}

// ── La feuille ─────────────────────────────────────────────────────────────

export const classesFeuille = (p: Presentation) => [
  "pb-feuille", `pb-texte-${p.tailleTexte}`, `pb-police-${p.police}`, `pb-schema-${p.tailleSchema}`,
  p.capitales && "pb-majuscules", !p.cadres && "pb-sans-cadre",
].filter(Boolean).join(" ");

/** L'en-tête de la première page : titre, prénom et date, selon la présentation. */
export function enteteFeuille(titre: string, p: Presentation): string {
  const t = p.titre && titre.trim() ? `<h1>${escapeHtml(titre.trim())}</h1>` : "";
  const nom = p.nomDate ? `<div class="pb-nom">Prénom : <span class="pb-ligne"></span> Date : <span class="pb-ligne pb-courte"></span></div>` : "";
  return t || nom ? `<header class="pb-entete${t ? "" : " pb-entete-nom"}">${t}${nom}</header>` : "";
}

export function blocProbleme(pb: Probleme, i: number, p: Presentation): string {
  const avecEnonce = p.enonce && !!pb.enonce;
  const numero = p.numeros ? `<div class="pb-numero">${i + 1}</div>` : "";
  const enonce = avecEnonce ? `<p class="pb-enonce">${escapeHtml(pb.enonce)}</p>` : "";
  // Sans énoncé, les nombres ne peuvent venir que du schéma.
  const schema = avecEnonce && p.schema === "sans"
    ? `<div class="pb-cadre"></div>`
    : `<div class="pb-schema">${schemaSvg(pb.schema, avecEnonce && p.schema === "vide" ? "vide" : "nombres", styleSchema(p))}</div>`;
  const lignes = [p.calcul && "Calcul", p.reponse && "Réponse"].filter(Boolean)
    .map((mot) => `<div>${mot} : <span class="pb-ligne"></span></div>`);
  const reponse = lignes.length ? `<div class="pb-reponse pb-reponse-${lignes.length}">${lignes.join("")}</div>` : "";
  return `<section class="pb-probleme">${numero}<div class="pb-contenu">${enonce}${schema}${reponse}</div></section>`;
}

/** Le corrigé est pour l'enseignant : numéroté et encadré quelle que soit la feuille de l'élève. */
export function blocCorrige(pb: Probleme, i: number, p: Presentation): string {
  const avecEnonce = p.enonce && !!pb.enonce;
  return `<section class="pb-probleme">` + `<div class="pb-numero">${i + 1}</div><div class="pb-contenu">`
    + (avecEnonce ? `<p class="pb-enonce pb-rappel">${escapeHtml(pb.enonce)}</p>` : "")
    + `<div class="pb-schema">${schemaSvg(pb.schema, "corrige", styleSchema(p))}</div>`
    + `<p class="pb-solution"><b>Calcul :</b> ${escapeHtml(pb.calcul)}${avecEnonce && pb.phrase ? ` · <b>Réponse :</b> ${escapeHtml(pb.phrase)}` : ""}</p>`
    + `</div></section>`;
}

/** Les problèmes regroupés par page ; 0 : une seule suite. */
export function decouperEnPages<T>(elements: T[], parPage: number): T[][] {
  if (parPage <= 0 || elements.length <= parPage) return [elements];
  const pages: T[][] = [];
  for (let k = 0; k < elements.length; k += parPage) pages.push(elements.slice(k, k + parPage));
  return pages;
}

/** Le corps de la feuille à imprimer, suivi de son corrigé sur une nouvelle page si demandé. */
export function feuilleProblemes(problemes: Probleme[], titre: string, p: Presentation): string {
  const grille = (blocs: string[], colonnes: number) => `<div class="pb-grille pb-colonnes-${colonnes}">${blocs.join("")}</div>`;
  const pages = decouperEnPages(problemes.map((pb, i) => blocProbleme(pb, i, p)), p.parPage);
  const corps = pages.map((page, k) =>
    `<div class="pb-page${k < pages.length - 1 ? " pb-saut" : ""}">${k === 0 ? enteteFeuille(titre, p) : ""}${grille(page, p.colonnes)}</div>`).join("");
  const corrige = p.corrige
    ? `<div class="pb-corrige"><header class="pb-entete"><h1>Corrigé${titre.trim() ? ` · ${escapeHtml(titre.trim())}` : ""}</h1></header>`
      + `${grille(problemes.map((pb, i) => blocCorrige(pb, i, p)), p.enonce ? 1 : 2)}</div>`
    : "";
  return `<div class="${classesFeuille(p)}">${corps}${corrige}</div>`;
}

/** Styles de la feuille, pour l'impression comme pour l'aperçu. */
export const STYLE_FEUILLE = `
  .pb-feuille { color: #1c2233; }
  .pb-police-arial { font-family: Arial, Helvetica, sans-serif; }
  .pb-police-verdana { font-family: Verdana, Geneva, sans-serif; }
  .pb-police-comic { font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', sans-serif; }
  .pb-entete { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap;
    border-bottom: 2px solid #e3e6ef; padding-bottom: 6px; margin-bottom: 12px; }
  .pb-entete-nom { justify-content: flex-end; }
  .pb-entete h1 { font-size: 22px; margin: 0; }
  .pb-nom { font-size: 14px; color: #444; white-space: nowrap; }
  .pb-probleme { display: flex; gap: 12px; break-inside: avoid; page-break-inside: avoid; border: 1px solid #cfd4e2;
    border-radius: 10px; padding: 12px 14px; margin: 0 0 12px; background: #fff; }
  .pb-sans-cadre .pb-probleme { border-color: transparent; padding-left: 0; padding-right: 0; }
  .pb-numero { flex: none; width: 28px; height: 28px; border-radius: 50%; background: #eef0fe; color: #4338ca;
    font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; }
  .pb-contenu { flex: 1; min-width: 0; }
  .pb-enonce { font-size: 16px; line-height: 1.55; margin: 2px 0 10px; }
  .pb-texte-grande .pb-enonce { font-size: 21px; }
  .pb-texte-tres-grande .pb-enonce { font-size: 28px; line-height: 1.45; }
  .pb-majuscules .pb-enonce { text-transform: uppercase; letter-spacing: .02em; }
  .pb-schema svg { display: block; width: 100%; max-width: 460px; height: auto; }
  .pb-schema-grand .pb-schema svg { max-width: 640px; }
  .pb-schema-pleine .pb-schema svg { max-width: 100%; }
  .pb-colonnes-2 .pb-schema svg { max-width: 100%; }
  .pb-cadre { height: 150px; border: 2px dashed #b9c0d4; border-radius: 8px; }
  .pb-reponse { display: grid; grid-template-columns: 1fr 1.6fr; gap: 18px; margin-top: 12px; font-size: 15px; }
  .pb-reponse-1 { grid-template-columns: 1fr; }
  .pb-reponse > div { display: flex; align-items: flex-end; gap: 6px; white-space: nowrap; }
  .pb-ligne { display: inline-block; border-bottom: 1.5px dotted #777; height: 1.1em; vertical-align: bottom; }
  .pb-reponse .pb-ligne { flex: 1; }
  .pb-nom .pb-ligne { width: 150px; }
  .pb-nom .pb-courte { width: 90px; }
  .pb-grille { display: grid; gap: 0 14px; }
  .pb-colonnes-1 { grid-template-columns: 1fr; }
  .pb-colonnes-2 { grid-template-columns: 1fr 1fr; }
  .pb-saut { break-after: page; page-break-after: always; }
  .pb-corrige { break-before: page; page-break-before: always; margin-top: 24px; }
  .pb-corrige .pb-probleme { border-color: #cfd4e2; padding: 12px 14px; }
  .pb-corrige .pb-rappel { font-size: 13px; color: #555; text-transform: none; letter-spacing: 0; }
  .pb-corrige .pb-schema svg { max-width: 460px; }
  .pb-corrige .pb-colonnes-2 .pb-schema svg { max-width: 100%; }
  .pb-solution { font-size: 14px; margin: 8px 0 0; }
`;
