// Les problèmes des séquences des livrets, et leurs feuilles.
//
// L'atelier « Problèmes partie-tout » rédige des réunions de collections. Les
// séquences des livrets (voir demarchesProblemes.ts) demandent davantage : des
// retraits et des ajouts dont on cherche la valeur finale, la transformation
// ou la valeur de départ — tous des problèmes parties-tout —, et au CE2 des
// problèmes en deux étapes, une comparaison puis le tout. On les rédige ici,
// dans les habillages des livrets — les cerises de Zoé, l'autobus, la cour de
// récréation au CP ; les coffres des brigands, les oiseaux migrateurs, le
// potager au CE1 ; les billes de Léo et Lucie au CE2 —, avec leurs problèmes
// de référence tels quels. Chaque problème garde son schéma en barres : la
// feuille le donne à compléter, ou laisse un cadre pour le dessiner, et le
// corrigé le montre toujours.

import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { hasard } from "./hasard";
import { choisir, entier } from "./nombres";
import { PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes, nombre, type Presentation, type Probleme } from "./problemesBarres";

/**
 * Ce qu'on cherche dans un problème parties-tout, et ce que veulent dire les deux nombres de l'énoncé, x et y :
 * - « reste » : x au départ, y retiré ; on cherche ce qui reste ;
 * - « partie » : x en tout, y dans une partie ; on cherche l'autre partie ;
 * - « tout » : x et y, les deux parties ; on cherche le tout ;
 * - « final-ajout » : x au départ, y ajouté ; on cherche la valeur finale ;
 * - « ajoute » : x au départ, y à la fin ; on cherche ce qu'on a ajouté ;
 * - « retire » : x au départ, y à la fin ; on cherche ce qu'on a retiré ;
 * - « depart-ajout » : x ajouté, y à la fin ; on cherche la valeur de départ ;
 * - « depart-retrait » : x retiré, y à la fin ; on cherche la valeur de départ.
 */
export type Structure = "reste" | "partie" | "tout" | "final-ajout" | "ajoute" | "retire" | "depart-ajout" | "depart-retrait";

/** Le tout, la partie connue et la réponse d'une structure : le tout est-il cherché ? */
function lesNombres(s: Structure, x: number, y: number): { tout: number; connues: [number, number?]; reponse: number; chercheTout: boolean } {
  switch (s) {
    case "reste": case "partie": return { tout: x, connues: [y], reponse: x - y, chercheTout: false };
    case "retire": return { tout: x, connues: [y], reponse: x - y, chercheTout: false };
    case "ajoute": case "depart-ajout": return { tout: y, connues: [x], reponse: y - x, chercheTout: false };
    case "tout": case "final-ajout": case "depart-retrait": return { tout: x + y, connues: [x, y], reponse: x + y, chercheTout: true };
  }
}

/** Un problème parties-tout : son énoncé, sa phrase réponse, et le schéma que ses nombres dessinent. */
export function problemeParties(s: Structure, x: number, y: number, enonce: string, phrase: (r: number) => string): Probleme {
  const { tout, connues, reponse, chercheTout } = lesNombres(s, x, y);
  const a = connues[0];
  return {
    schema: chercheTout
      ? { forme: "parties", tout: { valeur: tout, connue: false }, parties: [{ valeur: x, connue: true }, { valeur: y, connue: true }] }
      : { forme: "parties", tout: { valeur: tout, connue: true }, parties: [{ valeur: a, connue: true }, { valeur: reponse, connue: false }] },
    situation: { forme: "parties", contexte: 0, categories: [0, 1], qui: "" },
    enonce, reponse, phrase: phrase(reponse),
    calcul: chercheTout ? `${nombre(x)} + ${nombre(y)} = ${nombre(reponse)}` : `${nombre(tout)} − ${nombre(a)} = ${nombre(reponse)}`,
  };
}

// ── Les habillages ────────────────────────────────────────────────────────

/** Une façon de raconter une structure : l'énoncé et la phrase réponse, d'après x et y. */
type Modele = (x: number, y: number) => [enonce: string, phrase: (r: number) => string];
type Habillage = Partial<Record<Structure, Modele>>;

const n = nombre;
/** Des fruits, tous féminins : « Combien de cerises Zoé a-t-elle enlevées ? » s'accorde. */
const FRUITS = ["cerises", "poires", "fraises", "prunes", "pommes", "mirabelles"];

/** Un panier d'un fruit : Zoé enlève, ajoute. */
const panierDe = (f: string): Habillage => ({
  reste: (x, y) => [`Il y a ${n(x)} ${f} dans un panier. Zoé enlève ${n(y)} ${f}. Combien de ${f} y a-t-il dans le panier maintenant ?`,
    (r) => `Il y a ${n(r)} ${f} dans le panier.`],
  "final-ajout": (x, y) => [`Il y a ${n(x)} ${f} dans un panier. Zoé ajoute ${n(y)} ${f}. Combien de ${f} y a-t-il dans le panier maintenant ?`,
    (r) => `Il y a ${n(r)} ${f} dans le panier.`],
  ajoute: (x, y) => [`Il y avait ${n(x)} ${f} dans le panier. Zoé en a ajouté. Maintenant, il y a ${n(y)} ${f} dans le panier. Combien de ${f} Zoé a-t-elle ajoutées ?`,
    (r) => `Zoé a ajouté ${n(r)} ${f}.`],
  retire: (x, y) => [`Il y avait ${n(x)} ${f} dans le panier. Zoé en a enlevé. Maintenant, il y a ${n(y)} ${f} dans le panier. Combien de ${f} Zoé a-t-elle enlevées ?`,
    (r) => `Zoé a enlevé ${n(r)} ${f}.`],
});

/** Les habillages du livret CP : paniers de fruits, autobus, cour de récréation, espaces sportifs. */
export const HABILLAGES_CP: Record<string, (alea: () => number) => Habillage> = {
  fruits: (alea) => panierDe(choisir(alea, FRUITS)),
  autobus: () => ({
    reste: (x, y) => [`Il y a ${n(x)} personnes dans le bus. ${n(y)} personnes descendent. Combien de personnes y a-t-il dans le bus maintenant ?`,
      (r) => `Il y a ${n(r)} personnes dans le bus.`],
    "final-ajout": (x, y) => [`Il y a ${n(x)} personnes dans le bus. ${n(y)} personnes montent. Combien de personnes y a-t-il dans le bus maintenant ?`,
      (r) => `Il y a ${n(r)} personnes dans le bus.`],
    ajoute: (x, y) => [`Il y avait ${n(x)} personnes dans le bus. Des personnes sont montées. Maintenant, il y a ${n(y)} personnes dans le bus. Combien de personnes sont montées ?`,
      (r) => `${n(r)} personnes sont montées.`],
    retire: (x, y) => [`Il y avait ${n(x)} personnes dans le bus. Des personnes sont descendues. Maintenant, il y a ${n(y)} personnes dans le bus. Combien de personnes sont descendues ?`,
      (r) => `${n(r)} personnes sont descendues.`],
  }),
  cour: () => ({
    partie: (x, y) => [`Il y a ${n(x)} élèves en récréation. ${n(y)} élèves jouent sous le préau. Les autres élèves jouent dans la cour. Combien d'élèves y a-t-il dans la cour ?`,
      (r) => `Il y a ${n(r)} élèves dans la cour.`],
    tout: (x, y) => [`${n(x)} élèves jouent sous le préau et ${n(y)} élèves jouent dans la cour. Combien d'élèves y a-t-il en récréation ?`,
      (r) => `Il y a ${n(r)} élèves en récréation.`],
  }),
  stade: () => ({
    partie: (x, y) => [`Il y a ${n(x)} enfants au stade. ${n(y)} enfants jouent au football. Les autres font de la course. Combien d'enfants font de la course ?`,
      (r) => `${n(r)} enfants font de la course.`],
    tout: (x, y) => [`Au stade, ${n(x)} enfants jouent au football et ${n(y)} enfants font de la course. Combien d'enfants y a-t-il au stade ?`,
      (r) => `Il y a ${n(r)} enfants au stade.`],
  }),
};

/** Les habillages du livret CE1 : les coffres des brigands, les oiseaux migrateurs de Zigomar, le potager. */
export const HABILLAGES_CE1: Record<string, (alea: () => number) => Habillage> = {
  brigands: () => ({
    partie: (x, y) => [`Les brigands ont rangé ${n(x)} pièces d'or dans deux coffres, un rouge et un bleu. Il y a ${n(y)} pièces dans le coffre rouge. Combien de pièces y a-t-il dans le coffre bleu ?`,
      (r) => `Il y a ${n(r)} pièces dans le coffre bleu.`],
    // Sans « en tout » dans la question : on ne reconnaît pas l'addition à ce seul mot.
    tout: (x, y) => [`Les brigands ont rangé ${n(x)} pièces d'or dans le coffre rouge et ${n(y)} pièces dans le coffre bleu. Combien de pièces ont-ils rangées dans les deux coffres ?`,
      (r) => `Ils ont rangé ${n(r)} pièces dans les deux coffres.`],
    reste: (x, y) => [`Il y a ${n(x)} pièces d'or dans le coffre des brigands. Ils en prennent ${n(y)}. Combien de pièces reste-t-il dans le coffre ?`,
      (r) => `Il reste ${n(r)} pièces dans le coffre.`],
    retire: (x, y) => [`Il y avait ${n(x)} pièces d'or dans le coffre des brigands. Ils en ont pris. Il en reste ${n(y)}. Combien de pièces les brigands ont-ils prises ?`,
      (r) => `Les brigands ont pris ${n(r)} pièces.`],
    "depart-retrait": (x, y) => [`Les brigands ont pris ${n(x)} pièces d'or dans leur coffre. Il en reste ${n(y)}. Combien de pièces y avait-il dans le coffre avant ?`,
      (r) => `Il y avait ${n(r)} pièces dans le coffre.`],
    "final-ajout": (x, y) => [`Il y a ${n(x)} pièces d'or dans le coffre des brigands. Ils en ajoutent ${n(y)}. Combien de pièces y a-t-il dans le coffre maintenant ?`,
      (r) => `Il y a ${n(r)} pièces dans le coffre.`],
    ajoute: (x, y) => [`Il y avait ${n(x)} pièces d'or dans le coffre des brigands. Ils en ont ajouté. Maintenant, il y en a ${n(y)}. Combien de pièces ont-ils ajoutées ?`,
      (r) => `Ils ont ajouté ${n(r)} pièces.`],
    "depart-ajout": (x, y) => [`Les brigands ajoutent ${n(x)} pièces d'or dans leur coffre. Maintenant, il y en a ${n(y)}. Combien de pièces y avait-il dans le coffre avant ?`,
      (r) => `Il y avait ${n(r)} pièces dans le coffre.`],
  }),
  oiseaux: () => ({
    partie: (x, y) => [`Au bord du fleuve, il y a ${n(x)} oiseaux migrateurs : des hirondelles et des cigognes. Il y a ${n(y)} hirondelles. Combien y a-t-il de cigognes ?`,
      (r) => `Il y a ${n(r)} cigognes.`],
    tout: (x, y) => [`Au bord du fleuve, il y a ${n(x)} hirondelles et ${n(y)} cigognes. Combien d'oiseaux migrateurs y a-t-il au bord du fleuve ?`,
      (r) => `Il y a ${n(r)} oiseaux migrateurs au bord du fleuve.`],
    reste: (x, y) => [`Il y a ${n(x)} oiseaux dans le grand arbre. ${n(y)} oiseaux s'envolent vers l'Afrique. Combien d'oiseaux reste-t-il dans l'arbre ?`,
      (r) => `Il reste ${n(r)} oiseaux dans l'arbre.`],
    retire: (x, y) => [`Il y avait ${n(x)} oiseaux dans le grand arbre. Des oiseaux se sont envolés vers l'Afrique. Il en reste ${n(y)}. Combien d'oiseaux se sont envolés ?`,
      (r) => `${n(r)} oiseaux se sont envolés.`],
    "depart-retrait": (x, y) => [`${n(x)} oiseaux se sont envolés du grand arbre vers l'Afrique. Il en reste ${n(y)} dans l'arbre. Combien d'oiseaux y avait-il dans l'arbre avant ?`,
      (r) => `Il y avait ${n(r)} oiseaux dans l'arbre.`],
    "final-ajout": (x, y) => [`Il y a ${n(x)} oiseaux dans le grand arbre. ${n(y)} oiseaux arrivent. Combien d'oiseaux y a-t-il dans l'arbre maintenant ?`,
      (r) => `Il y a ${n(r)} oiseaux dans l'arbre.`],
    ajoute: (x, y) => [`Il y avait ${n(x)} oiseaux dans le grand arbre. D'autres oiseaux sont arrivés. Maintenant, il y en a ${n(y)}. Combien d'oiseaux sont arrivés ?`,
      (r) => `${n(r)} oiseaux sont arrivés.`],
    "depart-ajout": (x, y) => [`${n(x)} oiseaux arrivent dans le grand arbre. Maintenant, il y en a ${n(y)}. Combien d'oiseaux y avait-il dans l'arbre avant ?`,
      (r) => `Il y avait ${n(r)} oiseaux dans l'arbre.`],
  }),
  legumes: () => ({
    partie: (x, y) => [`Dans le potager, il y a ${n(x)} légumes : des carottes et des navets. Il y a ${n(y)} carottes. Combien y a-t-il de navets ?`,
      (r) => `Il y a ${n(r)} navets.`],
    tout: (x, y) => [`Dans le potager, il y a ${n(x)} carottes et ${n(y)} navets. Combien de légumes y a-t-il dans le potager ?`,
      (r) => `Il y a ${n(r)} légumes dans le potager.`],
  }),
};

// ── Les nombres ───────────────────────────────────────────────────────────

/** Les nombres d'un problème : deux données, et ce qu'elles respectent. */
interface Champ {
  /** Le plus grand nombre du problème — le tout. */
  max: number;
  /** Le plus petit tout. */
  min: number;
  /** Casser une dizaine (ou une retenue) : non, oui, ou peu importe. */
  cassage?: boolean;
  /** La partie connue en dizaines entières. */
  dizaines?: boolean;
}

/** Le tout et la partie connue (ou les deux parties) d'une structure, dans le champ. */
function tirerNombres(alea: () => number, s: Structure, c: Champ): [number, number] {
  for (let essai = 0; essai < 400; essai++) {
    const tout = entier(alea, c.min, c.max);
    const p = c.dizaines ? 10 * entier(alea, 1, Math.floor((tout - 1) / 10)) : entier(alea, Math.max(2, Math.floor(tout / 8)), tout - 2);
    const autre = tout - p;
    if (p < 2 || autre < 2) continue;
    // Le cassage : enlever p au tout demande de casser une dizaine ; ajouter les deux parties, une retenue.
    const casse = (p % 10) > (tout % 10);
    if (c.cassage !== undefined && casse !== c.cassage) continue;
    switch (s) {
      case "reste": case "partie": case "retire": return [tout, s === "retire" ? autre : p];
      case "ajoute": case "depart-ajout": return [s === "ajoute" ? autre : p, tout];
      case "tout": case "final-ajout": return [autre, p];
      case "depart-retrait": return [p, autre];
    }
  }
  return [c.max, Math.floor(c.max / 3)];
}

/** Des problèmes d'une structure ou de plusieurs, tour à tour, dans un habillage tiré pour la feuille ou pour chacun. */
export function problemesDuLivret(
  habillages: Record<string, (alea: () => number) => Habillage>, noms: string[], structures: Structure[], combien: number, champ: Champ, graine: number,
): Probleme[] {
  const alea = hasard(graine);
  const sortie: Probleme[] = [];
  const vus = new Set<string>();
  for (let essai = 0; sortie.length < combien && essai < 200; essai++) {
    const s = structures[sortie.length % structures.length];
    const possibles = noms.filter((h) => habillages[h]?.(alea)[s]);
    if (!possibles.length) break;
    const modele = habillages[choisir(alea, possibles)](alea)[s]!;
    const [x, y] = tirerNombres(alea, s, champ);
    const [enonce, phrase] = modele(x, y);
    if (vus.has(enonce)) continue;
    vus.add(enonce);
    sortie.push(problemeParties(s, x, y, enonce, phrase));
  }
  return sortie;
}

// ── CE2 : deux étapes, une comparaison puis le tout ──────────────────────

/** Une comparaison : « de plus » ou « de moins », et si la seconde valeur est la plus grande. Discordante quand le mot entendu trompe. */
export interface Comparaison { mot: "plus" | "moins"; secondPlusGrand: boolean }

interface Grandeur {
  id: "billes" | "pommes" | "monnaie" | "longueurs" | "durees";
  max: number;
  /** « Léo a », « La bande de Léo mesure », « La séance de sport dure ». */
  sujet: (qui: string) => string;
  /** « 37 billes », « 37 cm ». */
  mesure: (v: number) => string;
  /** Ce à quoi l'on compare : « Léo », « celle de Léo », « la séance de sport ». */
  autre: (qui: string) => string;
  /** La question du tout, et sa réponse. */
  question: (a: string, b: string) => string;
  reponse: (t: number) => string;
  /** La question de la seconde valeur seule — le problème en une étape —, et sa réponse. */
  questionUne: (b: string, pronom: string) => string;
  reponseUne: (b: string, v: number) => string;
}

const GRANDEURS: Grandeur[] = [
  {
    id: "billes", max: 90, sujet: (q) => `${q} a`, mesure: (v) => `${n(v)} billes`, autre: (q) => q,
    question: () => "Combien de billes ont-ils en tout ?", reponse: (t) => `Ils ont ${n(t)} billes en tout.`,
    questionUne: (b) => `Combien de billes a ${b} ?`, reponseUne: (b, v) => `${b} a ${n(v)} billes.`,
  },
  {
    id: "pommes", max: 90, sujet: (q) => `${q} a cueilli`, mesure: (v) => `${n(v)} pommes`, autre: (q) => q,
    question: () => "Combien de pommes ont-ils cueillies en tout ?", reponse: (t) => `Ils ont cueilli ${n(t)} pommes en tout.`,
    questionUne: (b, pronom) => `Combien de pommes ${b} a-t-${pronom} cueillies ?`, reponseUne: (b, v) => `${b} a cueilli ${n(v)} pommes.`,
  },
  {
    id: "monnaie", max: 90, sujet: (q) => `${q} a`, mesure: (v) => `${n(v)} €`, autre: (q) => q,
    question: () => "Combien d'argent ont-ils en tout ?", reponse: (t) => `Ils ont ${n(t)} € en tout.`,
    questionUne: (b) => `Combien d'argent a ${b} ?`, reponseUne: (b, v) => `${b} a ${n(v)} €.`,
  },
  {
    id: "longueurs", max: 90, sujet: (q) => `La bande de ${q} mesure`, mesure: (v) => `${n(v)} cm`, autre: (q) => `celle de ${q}`,
    question: (a, b) => `Quelle longueur mesurent les bandes de ${a} et de ${b} mises bout à bout ?`,
    reponse: (t) => `Les deux bandes mises bout à bout mesurent ${n(t)} cm.`,
    questionUne: (b) => `Combien mesure la bande de ${b} ?`, reponseUne: (b, v) => `La bande de ${b} mesure ${n(v)} cm.`,
  },
  {
    id: "durees", max: 60, sujet: (q) => `La séance de ${q} dure`, mesure: (v) => `${n(v)} minutes`, autre: (q) => `la séance de ${q}`,
    question: (a, b) => `Combien de temps durent la séance de ${a} et la séance de ${b} ensemble ?`,
    reponse: (t) => `Les deux séances durent ${n(t)} minutes ensemble.`,
    questionUne: (b) => `Combien de temps dure la séance de ${b} ?`, reponseUne: (b, v) => `La séance de ${b} dure ${n(v)} minutes.`,
  },
];

/** Des paires de prénoms, et le pronom de chacun : « Combien de pommes Lucie a-t-elle cueillies ? » */
const PAIRES: [string, string][] = [["Léo", "Lucie"], ["Maël", "Lou"], ["Inès", "Tom"], ["Jade", "Noah"], ["Emma", "Adam"], ["Lina", "Sacha"]];
const ELLES = new Set(["Lucie", "Lou", "Inès", "Jade", "Emma", "Lina"]);
const MATIERES: [string, string][] = [["sport", "musique"], ["lecture", "peinture"], ["chant", "danse"]];

/**
 * Un problème de comparaison : la première valeur et l'écart sont donnés ; on cherche la seconde (une étape) ou le
 * tout (deux étapes). « Lucie a 20 billes de plus que Léo » ; discordant : « Maël a 10 billes de plus que Lou » —
 * on entend « de plus », et Lou, que l'on cherche, a le moins.
 */
export function problemeDeComparaison(g: Grandeur["id"], a: number, e: number, c: Comparaison, deuxEtapes: boolean, noms: [string, string]): Probleme {
  const gr = GRANDEURS.find((x) => x.id === g) ?? GRANDEURS[0];
  const [qa, qb] = noms;
  const b = c.secondPlusGrand ? a + e : a - e;
  // La seconde est le sujet de la comparaison quand le mot dit vrai sur elle : « B a e de plus » quand B est la plus grande.
  const sujetEstB = (c.mot === "plus") === c.secondPlusGrand;
  const ecart = sujetEstB
    ? `${gr.sujet(qb)} ${gr.mesure(e)} de ${c.mot} que ${gr.autre(qa)}.`
    : `${gr.sujet(qa)} ${gr.mesure(e)} de ${c.mot} que ${gr.autre(qb)}.`;
  const tout = a + b;
  const etape1 = c.secondPlusGrand ? `${n(a)} + ${n(e)} = ${n(b)}` : `${n(a)} − ${n(e)} = ${n(b)}`;
  return {
    // Deux étapes : le tout et ses deux parties ; une étape : la plus grande valeur, faite de la plus petite et de l'écart.
    schema: deuxEtapes
      ? { forme: "parties", tout: { valeur: tout, connue: false }, parties: [{ valeur: a, connue: true }, { valeur: b, connue: false }] }
      : { forme: "parties", tout: { valeur: Math.max(a, b), connue: !c.secondPlusGrand },
        parties: [{ valeur: Math.min(a, b), connue: c.secondPlusGrand }, { valeur: e, connue: true }] },
    situation: { forme: "parties", contexte: 0, categories: [0, 1], qui: "" },
    enonce: `${gr.sujet(qa)} ${gr.mesure(a)}. ${ecart} ${deuxEtapes ? gr.question(qa, qb) : gr.questionUne(qb, ELLES.has(qb) ? "elle" : "il")}`,
    reponse: deuxEtapes ? tout : b,
    calcul: deuxEtapes ? `${etape1} ; ${n(a)} + ${n(b)} = ${n(tout)}` : etape1,
    phrase: deuxEtapes ? gr.reponse(tout) : gr.reponseUne(qb, b),
  };
}

/**
 * Des problèmes de comparaison, en deux étapes ou en une selon le rang ; l'écart en dizaines entières, parfois un peu
 * plus, pour le calcul mental ; un énoncé sur deux discordant.
 */
export function problemesDeComparaison(grandeurs: Grandeur["id"][], combien: number, graine: number, etapes: (rang: number) => 1 | 2): Probleme[] {
  const alea = hasard(graine);
  const sortie: Probleme[] = [];
  for (let essai = 0; sortie.length < combien && essai < 200; essai++) {
    const k = sortie.length;
    const gr = GRANDEURS.find((x) => x.id === grandeurs[k % grandeurs.length])!;
    const a = entier(alea, 21, gr.max - 25);
    const e = choisir(alea, [10, 20, 30]) + (alea() < 0.4 ? choisir(alea, [1, 2, 5, 9]) : 0);
    const c: Comparaison = { mot: alea() < 0.5 ? "plus" : "moins", secondPlusGrand: k % 2 === 0 };
    if (!c.secondPlusGrand && a - e < 5) continue;
    const noms = gr.id === "durees" ? choisir(alea, MATIERES) : choisir(alea, PAIRES);
    sortie.push(problemeDeComparaison(gr.id, a, e, c, etapes(k) === 2, noms));
  }
  return sortie;
}

// ── Les feuilles des séquences ────────────────────────────────────────────

/** La présentation d'une feuille de séquence : le schéma à compléter, ou un cadre pour le dessiner. */
const presentation = (schema: Presentation["schema"]): Presentation => ({ ...PRESENTATION_COMPLETE, schema });

function feuilleDeProblemes(seance: number, titre: string, schema: Presentation["schema"], problemes: (graine: number) => Probleme[]): FeuilleAFabriquer {
  return {
    seance, atelier: "partieTout", titre,
    fabriquer: (graine) => ({ html: feuilleProblemes(problemes(graine), titre, presentation(schema)), style: STYLE_PROBLEMES }),
  };
}

/** La note du matériel de chaque séance, avec les feuilles nommées comme elles s'impriment. */
function notes(feuilles: FeuilleAFabriquer[], debuts: string[]): string[] {
  return debuts.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
}

const CP = (cassage?: boolean, dizaines?: boolean): Champ => ({ min: 25, max: 99, cassage, dizaines });
const CE1_MENTAL: Champ = { min: 120, max: 980, dizaines: true };
const CE1_POSE: Champ = { min: 120, max: 980 };

/** Les cerises de Zoé : le problème de la leçon et ceux de l'entraînement, comme le livret les donne. */
const CERISES = (graine: number): Probleme[] => [
  problemeParties("reste", 56, 14, "Il y a 56 cerises dans un panier. Zoé enlève 14 cerises. Combien de cerises y a-t-il dans le panier maintenant ?", (r) => `Il y a ${r} cerises dans le panier.`),
  problemeParties("reste", 43, 21, "Il y a 43 cerises dans un panier. Zoé enlève 21 cerises. Combien de cerises y a-t-il dans le panier maintenant ?", (r) => `Il y a ${r} cerises dans le panier.`),
  // Le troisième retire des dizaines entières — des poires — : on n'entoure que des dizaines.
  ...problemesDuLivret({ poires: () => panierDe("poires") }, ["poires"], ["reste"], 1, CP(false, true), graine),
  ...problemesDuLivret(HABILLAGES_CP, ["fruits"], ["reste"], 2, { min: 60, max: 99, cassage: false }, graine + 1),
];

function planPartiesToutCP(): PlanDesFeuilles {
  const tous = ["fruits", "autobus", "cour", "stade"];
  const f = (seance: number, titre: string, schema: Presentation["schema"], p: (g: number) => Probleme[]) => feuilleDeProblemes(seance, titre, schema, p);
  const feuilles: FeuilleAFabriquer[] = [
    f(0, "Problèmes — les cerises de Zoé", "sans", CERISES),
    f(1, "Problèmes à l'ardoise — ce qui reste", "sans", (g) => problemesDuLivret(HABILLAGES_CP, ["fruits", "autobus"], ["reste"], 3, CP(false), g)),
    f(2, "Problèmes à l'ardoise — une collection en deux parties", "sans", (g) => problemesDuLivret(HABILLAGES_CP, ["fruits", "cour"], ["reste", "partie", "partie"], 3, CP(false), g)),
    f(3, "Problèmes — casser une dizaine", "sans", (g) => [
      problemeParties("partie", 43, 27, "Il y a 43 élèves en récréation. 27 élèves jouent sous le préau. Les autres élèves jouent dans la cour. Combien d'élèves y a-t-il dans la cour ?", (r) => `Il y a ${r} élèves dans la cour.`),
      ...problemesDuLivret(HABILLAGES_CP, ["cour", "stade"], ["partie"], 4, CP(true), g),
    ]),
    f(4, "Problèmes à l'ardoise — ce qui reste, avec ou sans cassage", "sans", (g) => [
      ...problemesDuLivret(HABILLAGES_CP, tous, ["reste"], 1, CP(false), g), ...problemesDuLivret(HABILLAGES_CP, tous, ["reste"], 1, CP(true), g + 1)]),
    f(5, "Problèmes à l'ardoise — l'autre partie, avec ou sans cassage", "sans", (g) => [
      ...problemesDuLivret(HABILLAGES_CP, tous, ["partie"], 1, CP(true), g), ...problemesDuLivret(HABILLAGES_CP, tous, ["partie"], 1, CP(false), g + 1)]),
    // L'évaluation du livret, mot pour mot.
    f(6, "Évaluation intermédiaire — deux problèmes", "sans", () => [
      problemeParties("partie", 58, 26, "Il y a 58 élèves en récréation. 26 élèves jouent sous le préau. Les autres jouent dans la cour. Combien d'élèves y a-t-il dans la cour ?", (r) => `Il y a ${r} élèves dans la cour.`),
      problemeParties("reste", 45, 18, "Il y a 45 cerises dans un panier. Zoé enlève 18 cerises. Combien de cerises y a-t-il dans le panier maintenant ?", (r) => `Il y a ${r} cerises dans le panier.`),
    ]),
    f(7, "Problèmes — le tout ou une partie ? (le bus)", "sans", (g) => problemesDuLivret(HABILLAGES_CP, ["autobus"], ["final-ajout", "reste"], 6, CP(), g)),
    f(8, "Problèmes à l'ardoise — la valeur finale", "sans", (g) => problemesDuLivret(HABILLAGES_CP, ["fruits", "autobus"], ["final-ajout", "reste", "final-ajout"], 3, CP(), g)),
    f(9, "Problèmes à l'ardoise — le tout ou une partie", "sans", (g) => problemesDuLivret(HABILLAGES_CP, ["cour", "stade"], ["tout", "partie", "partie"], 3, CP(), g)),
    f(10, "Problèmes à l'ardoise — ce qu'on a ajouté", "sans", (g) => problemesDuLivret(HABILLAGES_CP, ["autobus", "fruits"], ["final-ajout", "ajoute", "ajoute"], 3, CP(), g)),
    f(11, "Problèmes à l'ardoise — ce qu'on a ajouté ou retiré", "sans", (g) => problemesDuLivret(HABILLAGES_CP, ["autobus", "fruits"], ["ajoute", "retire", "final-ajout"], 3, CP(), g)),
    f(12, "Problèmes — tout mêlé", "sans", (g) => problemesDuLivret(HABILLAGES_CP, tous, ["reste", "tout", "ajoute", "partie", "final-ajout", "retire"], 6, CP(), g)),
    f(13, "Évaluation — problèmes parties-tout", "sans", (g) => problemesDuLivret(HABILLAGES_CP, tous, ["partie", "final-ajout", "reste", "ajoute", "tout"], 5, CP(), g)),
  ];
  const ardoise = "Les ardoises ; des cubes en dizaines et unités pour simuler au besoin";
  return {
    feuilles,
    materiel: notes(feuilles, [
      "Un panier opaque ; des cubes emboîtables, en barres de dix et en vrac ; le tableau des nombres ; le cahier de leçons et le cahier d'entraînement",
      ardoise, ardoise,
      "Des cubes en barres de dix, à casser ; le cahier de leçons et le cahier d'entraînement",
      ardoise, ardoise,
      "Les énoncés codés à distribuer ; pour la remédiation, du matériel tangible",
      "Le cahier d'entraînement",
      ardoise, ardoise, ardoise, ardoise,
      "Le cahier d'entraînement",
      "Les énoncés à distribuer",
    ]),
  };
}

function planPartiesToutCE1(): PlanDesFeuilles {
  const f = feuilleDeProblemes;
  const p = (noms: string[], structures: Structure[], combien: number, champ: Champ) => (g: number) => problemesDuLivret(HABILLAGES_CE1, noms, structures, combien, champ, g);
  const tous = ["brigands", "oiseaux", "legumes"];
  const retraits: Structure[] = ["reste", "retire", "depart-retrait"];
  const ajouts: Structure[] = ["final-ajout", "ajoute", "depart-ajout"];
  const feuilles: FeuilleAFabriquer[] = [
    f(0, "Problèmes — les coffres des brigands", "vide", (g) => [
      problemeParties("partie", 146, 34, "Les brigands ont rangé 146 pièces d'or dans deux coffres, un rouge et un bleu. Il y a 34 pièces dans le coffre rouge. Combien de pièces y a-t-il dans le coffre bleu ?",
        (r) => `Il y a ${r} pièces dans le coffre bleu.`),
      ...p(["brigands"], ["partie", "tout", "partie", "tout"], 4, CE1_POSE)(g),
    ]),
    f(1, "Problèmes à l'ardoise — des oiseaux migrateurs", "vide", p(["oiseaux"], ["partie", "tout", "partie"], 3, CE1_MENTAL)),
    f(2, "Problèmes à l'ardoise — le potager", "vide", p(["legumes"], ["tout", "partie", "partie"], 3, CE1_MENTAL)),
    f(3, "Problèmes — réunir deux collections", "vide", p(tous, ["partie", "tout"], 6, CE1_POSE)),
    f(4, "Évaluation intermédiaire — réunir deux collections", "sans", p(tous, ["partie", "tout", "partie", "tout"], 4, CE1_POSE)),
    f(5, "Problèmes à l'ardoise — des retraits (les brigands)", "vide", p(["brigands"], retraits, 3, CE1_MENTAL)),
    f(6, "Problèmes à l'ardoise — des retraits (les oiseaux)", "vide", p(["oiseaux"], retraits, 3, CE1_MENTAL)),
    f(7, "Problèmes — des retraits", "vide", p(tous, retraits, 6, CE1_POSE)),
    f(8, "Problèmes à l'ardoise — des ajouts (les brigands)", "vide", p(["brigands"], ajouts, 3, CE1_MENTAL)),
    f(9, "Problèmes à l'ardoise — des ajouts (les oiseaux)", "vide", p(["oiseaux"], ajouts, 3, CE1_MENTAL)),
    f(10, "Problèmes — ajouts et retraits", "sans", p(tous, [...retraits, ...ajouts], 6, CE1_POSE)),
    f(11, "Évaluation — problèmes parties-tout", "sans", p(tous, ["partie", "reste", "ajoute", "tout", "depart-retrait"], 5, CE1_POSE)),
  ];
  const ardoise = "Les ardoises";
  return {
    feuilles,
    materiel: notes(feuilles, [
      "L'énoncé des coffres à projeter ; du matériel de numération et deux boîtes pour ceux qui ne se lancent pas ; le cahier de leçons et le cahier d'entraînement ; l'album Les trois brigands",
      `${ardoise} ; l'album L'Afrique de Zigomar`, `${ardoise} ; l'album Zigomar n'aime pas les légumes`,
      "Le cahier d'entraînement",
      "Les énoncés à distribuer",
      ardoise, ardoise,
      "Le cahier d'entraînement",
      ardoise, ardoise,
      "Le cahier d'entraînement",
      "Les énoncés à distribuer",
    ]),
  };
}

function planDeuxEtapesCE2(): PlanDesFeuilles {
  const f = feuilleDeProblemes;
  const deux = () => 2 as const;
  /** Une étape une fois sur deux : il faut se demander ce qu'on calcule d'abord. */
  const alterne = (rang: number) => (rang % 2 === 0 ? 2 : 1) as 1 | 2;
  const feuilles: FeuilleAFabriquer[] = [
    f(0, "Problèmes — les billes de Léo et Lucie", "sans", (g) => [
      problemeDeComparaison("billes", 37, 20, { mot: "plus", secondPlusGrand: true }, true, ["Léo", "Lucie"]),
      ...problemesDeComparaison(["billes"], 1, g, deux),
      problemeDeComparaison("billes", 44, 10, { mot: "plus", secondPlusGrand: false }, true, ["Maël", "Lou"]),
      ...problemesDeComparaison(["billes"], 2, g + 1, deux),
    ]),
    f(1, "Problèmes à l'ardoise — la même structure", "sans", (g) => problemesDeComparaison(["billes", "pommes"], 3, g, deux)),
    f(2, "Évaluation intermédiaire — deux problèmes", "sans", (g) => problemesDeComparaison(["billes", "pommes"], 2, g, deux)),
    f(3, "Problèmes à l'ardoise — la monnaie", "sans", (g) => problemesDeComparaison(["monnaie"], 3, g, deux)),
    f(4, "Problèmes à l'ardoise — une ou deux étapes ? (la monnaie)", "sans", (g) => problemesDeComparaison(["monnaie"], 3, g, alterne)),
    f(5, "Problèmes à l'ardoise — une ou deux étapes ? (des pommes)", "sans", (g) => problemesDeComparaison(["pommes"], 3, g, alterne)),
    f(6, "Problèmes — une ou deux étapes", "sans", (g) => problemesDeComparaison(["billes", "monnaie", "pommes"], 6, g, alterne)),
    f(7, "Problèmes à l'ardoise — des longueurs", "sans", (g) => problemesDeComparaison(["longueurs"], 3, g, alterne)),
    f(8, "Problèmes à l'ardoise — des durées", "sans", (g) => problemesDeComparaison(["durees"], 3, g, alterne)),
    f(9, "Problèmes — toutes les grandeurs", "sans", (g) => problemesDeComparaison(["billes", "monnaie", "longueurs", "durees"], 6, g, alterne)),
    // L'évaluation du livret : des problèmes en deux étapes, et un intrus en une étape.
    f(10, "Évaluation — problèmes en deux étapes", "sans", (g) => problemesDeComparaison(["billes", "monnaie", "longueurs", "durees", "pommes"], 5, g, (rang) => (rang === 3 ? 1 : 2))),
  ];
  const ardoise = "Les ardoises";
  return {
    feuilles,
    materiel: notes(feuilles, [
      "Du matériel en dizaines et unités pour jouer la scène ; le cahier de leçons et le cahier d'entraînement",
      ardoise, "Les énoncés à distribuer ; pour la remédiation, du matériel tangible",
      ardoise, ardoise, ardoise,
      "Le cahier d'entraînement",
      `${ardoise} ; des bandes de papier`, `${ardoise} ; l'emploi du temps de la classe`,
      "Le cahier d'entraînement",
      "Les énoncés à distribuer",
    ]),
  };
}

/** Les démarches de problèmes dont on sait fabriquer les feuilles. */
export const estUneDemarcheDeProblemes = (id: string) => ["parties-tout-cp", "parties-tout-ce1", "deux-etapes-ce2"].includes(id);

export function planDesProblemes(demarcheId: string): PlanDesFeuilles | null {
  if (demarcheId === "parties-tout-cp") return planPartiesToutCP();
  if (demarcheId === "parties-tout-ce1") return planPartiesToutCE1();
  if (demarcheId === "deux-etapes-ce2") return planDeuxEtapesCE2();
  return null;
}
