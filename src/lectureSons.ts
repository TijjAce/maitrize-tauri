// Fiches de sons : lire, entendre, écrire un graphème.
//
// La progression suit l'ordre des méthodes syllabiques — voyelles d'abord,
// puis les consonnes les plus fréquentes et les plus régulières, les
// graphèmes complexes ensuite. C'est celui de Pilotis, de Lecture Piano et
// des recommandations du guide ministériel de 2018 : on n'invente rien ici,
// on range.
//
// Le corpus est écrit à la main, mot par mot, parce qu'un mot de fiche de son
// doit être déchiffrable et connu de l'élève. Une liste tirée d'un
// dictionnaire donnerait « myrtille » pour le son [i].
//
// L'enseignant garde la main : il ajoute ses propres mots, et ce sont eux qui
// passent devant.

import { hasard } from "./problemesBarres";

export type SorteGrapheme = "voyelle" | "consonne" | "complexe";

export interface Son {
  id: string;
  /** Ce qu'on entend, comme on l'écrit au tableau. */
  son: string;
  /** Les façons de l'écrire : « o », « au », « eau ». */
  graphemes: string[];
  sorte: SorteGrapheme;
  /** Des mots déchiffrables où on l'entend. */
  mots: string[];
}

/**
 * Les sons, dans l'ordre où on les enseigne.
 *
 * Voyelles simples, puis les consonnes continues — celles qu'on peut tenir en
 * les prononçant, mmm, lll, rrr, sss —, qui se fondent plus facilement en
 * syllabes que les occlusives. Les graphèmes complexes ferment la marche.
 */
export const SONS: Son[] = [
  { id: "a", son: "[a]", graphemes: ["a"], sorte: "voyelle",
    mots: ["ami", "papa", "chat", "sac", "rat", "table", "avion", "banane"] },
  { id: "i", son: "[i]", graphemes: ["i", "y"], sorte: "voyelle",
    mots: ["ami", "lit", "midi", "riz", "livre", "souris", "pyjama", "image"] },
  { id: "o", son: "[o]", graphemes: ["o", "au", "eau"], sorte: "voyelle",
    mots: ["moto", "vélo", "eau", "bateau", "auto", "chapeau", "école", "domino"] },
  { id: "u", son: "[u]", graphemes: ["u"], sorte: "voyelle",
    mots: ["lune", "rue", "mur", "jupe", "tortue", "nature", "usine", "salut"] },
  { id: "e", son: "[ə]", graphemes: ["e"], sorte: "voyelle",
    mots: ["cheval", "petit", "menu", "repas", "chemin", "melon", "renard", "semaine"] },
  { id: "é", son: "[e]", graphemes: ["é", "er", "ez"], sorte: "voyelle",
    mots: ["école", "été", "café", "bébé", "cahier", "panier", "nez", "épée"] },
  { id: "è", son: "[ɛ]", graphemes: ["è", "ê", "ai", "ei"], sorte: "voyelle",
    mots: ["mère", "tête", "maison", "lait", "neige", "fête", "règle", "balai"] },
  { id: "m", son: "[m]", graphemes: ["m"], sorte: "consonne",
    mots: ["maman", "moto", "midi", "mur", "lame", "pomme", "mouton", "domino"] },
  { id: "l", son: "[l]", graphemes: ["l"], sorte: "consonne",
    mots: ["lit", "lune", "vélo", "salade", "école", "bol", "malade", "ballon"] },
  { id: "r", son: "[ʁ]", graphemes: ["r"], sorte: "consonne",
    mots: ["rue", "rat", "rire", "mur", "armoire", "arbre", "robe", "tartine"] },
  { id: "s", son: "[s]", graphemes: ["s", "ss", "ç"], sorte: "consonne",
    mots: ["sac", "salade", "souris", "tasse", "classe", "leçon", "sept", "poisson"] },
  { id: "f", son: "[f]", graphemes: ["f", "ph"], sorte: "consonne",
    mots: ["farine", "fille", "café", "girafe", "photo", "téléphone", "fourmi", "chiffre"] },
  { id: "ch", son: "[ʃ]", graphemes: ["ch"], sorte: "complexe",
    mots: ["chat", "cheval", "vache", "chapeau", "bouche", "chocolat", "niche", "chemise"] },
  { id: "n", son: "[n]", graphemes: ["n"], sorte: "consonne",
    mots: ["nid", "lune", "banane", "animal", "avenue", "niche", "canard", "nature"] },
  { id: "p", son: "[p]", graphemes: ["p"], sorte: "consonne",
    mots: ["papa", "pain", "pile", "poule", "soupe", "lapin", "pomme", "jupe"] },
  { id: "t", son: "[t]", graphemes: ["t"], sorte: "consonne",
    mots: ["tapis", "moto", "tortue", "table", "patte", "tomate", "tarte", "bateau"] },
  { id: "v", son: "[v]", graphemes: ["v"], sorte: "consonne",
    mots: ["vélo", "vache", "avion", "livre", "vert", "cheval", "hiver", "rêve"] },
  { id: "j", son: "[ʒ]", graphemes: ["j", "ge", "gi"], sorte: "consonne",
    mots: ["jupe", "jardin", "pyjama", "girafe", "bougie", "orange", "jouet", "nuage"] },
  { id: "b", son: "[b]", graphemes: ["b"], sorte: "consonne",
    mots: ["bébé", "balle", "robe", "banane", "arbre", "bol", "cabane", "bateau"] },
  { id: "d", son: "[d]", graphemes: ["d"], sorte: "consonne",
    mots: ["domino", "dame", "salade", "nid", "dos", "lundi", "radis", "dimanche"] },
  { id: "k", son: "[k]", graphemes: ["c", "k", "qu"], sorte: "consonne",
    mots: ["cadeau", "école", "sac", "koala", "quatre", "casque", "canard", "coq"] },
  { id: "g", son: "[g]", graphemes: ["g", "gu"], sorte: "consonne",
    mots: ["gare", "gâteau", "légume", "guitare", "bague", "gomme", "wagon", "figure"] },
  { id: "z", son: "[z]", graphemes: ["z", "s"], sorte: "consonne",
    mots: ["zèbre", "maison", "vase", "douze", "rose", "oiseau", "zéro", "chemise"] },
  { id: "ou", son: "[u]", graphemes: ["ou"], sorte: "complexe",
    mots: ["loup", "poule", "bouche", "mouton", "roue", "genou", "fourmi", "jour"] },
  { id: "on", son: "[ɔ̃]", graphemes: ["on", "om"], sorte: "complexe",
    mots: ["mouton", "ballon", "melon", "pont", "bonbon", "montagne", "nombre", "savon"] },
  { id: "an", son: "[ɑ̃]", graphemes: ["an", "en", "am", "em"], sorte: "complexe",
    mots: ["maman", "dent", "vent", "banc", "enfant", "pantalon", "chambre", "orange"] },
  { id: "in", son: "[ɛ̃]", graphemes: ["in", "ain", "ein", "im"], sorte: "complexe",
    mots: ["lapin", "pain", "main", "jardin", "sapin", "train", "matin", "peinture"] },
  { id: "oi", son: "[wa]", graphemes: ["oi", "oî"], sorte: "complexe",
    mots: ["oiseau", "roi", "armoire", "poire", "noir", "boîte", "étoile", "poisson"] },
  { id: "eu", son: "[ø]", graphemes: ["eu", "œu"], sorte: "complexe",
    mots: ["feu", "jeu", "cheveux", "fleur", "beurre", "cœur", "deux", "heureux"] },
  { id: "gn", son: "[ɲ]", graphemes: ["gn"], sorte: "complexe",
    mots: ["montagne", "araignée", "agneau", "peigne", "ligne", "cygne", "signe", "vigne"] },
];

export const sonDe = (id: string) => SONS.find((s) => s.id === id);

/** Les voyelles qu'on fait sonner dans les syllabes, dans l'ordre habituel. */
const VOYELLES = ["a", "i", "o", "u", "é", "e"];
/** Les consonnes qu'on marie à une voyelle quand c'est elle qu'on travaille. */
const CONSONNES = ["m", "l", "r", "s", "p", "t", "v", "f", "n", "d"];

/**
 * Les syllabes à lire.
 *
 * Une consonne se combine aux voyelles ; une voyelle reçoit les consonnes.
 * Un graphème complexe se traite comme la voyelle ou la consonne qu'il est :
 * « ou » donne « mou, lou, rou », « ch » donne « cha, chi, cho ».
 */
export function syllabes(son: Son, combien: number): string[] {
  const sortie: string[] = [];
  const voyelle = son.sorte === "voyelle" || ["ou", "on", "an", "in", "oi", "eu"].includes(son.id);
  const g = son.graphemes[0];
  const autres = voyelle ? CONSONNES : VOYELLES;
  for (const a of autres) {
    sortie.push(voyelle ? `${a}${g}` : `${g}${a}`);
    if (sortie.length >= combien) break;
  }
  return sortie;
}

/** Mélange reproductible. */
function melanger<T>(r: () => number, liste: readonly T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** Vrai si le mot s'écrit avec l'un des graphèmes du son. */
export const contientLeSon = (mot: string, son: Son) =>
  son.graphemes.some((g) => mot.toLowerCase().includes(g));

/**
 * Des mots où l'on n'entend pas le son, pour l'exercice « entoure ».
 *
 * Ils viennent des autres sons, et l'on écarte ceux qui contiennent quand
 * même le graphème travaillé : un intrus qui n'en est pas rend l'exercice
 * faux, et c'est l'élève qu'on met en faute.
 */
export function intrus(son: Son, combien: number, r: () => number): string[] {
  const vivier = SONS.filter((s) => s.id !== son.id).flatMap((s) => s.mots);
  const propres = [...new Set(vivier)].filter((m) => !contientLeSon(m, son));
  return melanger(r, propres).slice(0, combien);
}

export interface ReglagesLectureSons {
  son: string;
  /** Les mots de l'enseignant, une par ligne, qui passent devant les nôtres. */
  mesMots: string;
  syllabes: boolean;
  lireDesMots: boolean;
  entourer: boolean;
  completer: boolean;
  ecrire: boolean;
  titre: string;
}

export const REGLAGES_PAR_DEFAUT: ReglagesLectureSons = {
  son: "ch", mesMots: "", syllabes: true, lireDesMots: true, entourer: true,
  completer: true, ecrire: false, titre: "",
};

/** Les mots saisis par l'enseignant, un par ligne ou séparés par des virgules. */
export function lireMesMots(saisie: string): string[] {
  return [...new Set((saisie || "").split(/[\n,;]+/).map((m) => m.trim().toLowerCase()).filter(Boolean))];
}

export interface FicheSon {
  son: Son;
  titre: string;
  syllabes: string[];
  mots: string[];
  /** Les mots à entourer : ceux du son et des intrus, mêlés. */
  aEntourer: { mot: string; dedans: boolean }[];
  /** Mots à compléter : le graphème remplacé par des pointillés. */
  aCompleter: { trou: string; reponse: string }[];
}

/** La fiche entière, reproductible à graine égale. */
export function fabriquerFiche(reglages: ReglagesLectureSons, graine: number): FicheSon {
  const son = sonDe(reglages.son) ?? SONS[0];
  const r = hasard(graine);
  const miens = lireMesMots(reglages.mesMots).filter((m) => contientLeSon(m, son));
  const vivier = [...new Set([...miens, ...son.mots])];
  const mots = melanger(r, vivier).slice(0, 8);
  const faux = intrus(son, 4, r);
  const aEntourer = melanger(r, [
    ...mots.slice(0, 5).map((mot) => ({ mot, dedans: true })),
    ...faux.map((mot) => ({ mot, dedans: false })),
  ]);
  const g = son.graphemes[0];
  const aCompleter = mots.filter((m) => m.includes(g)).slice(0, 6)
    .map((mot) => ({ trou: mot.replace(g, "…"), reponse: mot }));
  return {
    son,
    titre: reglages.titre.trim() || `Le son ${son.son} — ${son.graphemes.join(", ")}`,
    syllabes: syllabes(son, 8),
    mots,
    aEntourer,
    aCompleter,
  };
}
