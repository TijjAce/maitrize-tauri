// La grammaire, l'orthographe grammaticale et la conjugaison du cours
// moyen, d'après le programme de français du cycle 3 (2025) et ses exemples
// de réussite (Éduscol, 2025).
//
// Un corpus de phrases simples analysées à la main — le groupe sujet, le
// verbe, les compléments d'objet direct et indirect, les compléments
// circonstanciels de temps, de lieu, de cause, l'attribut du sujet — et des
// phrases dont chaque mot a sa classe. Les exercices : les types et les
// formes de phrases, l'interrogation par l'intonation, « est-ce que » et
// l'inversion (Mange-t-il des fruits ?) ; le sujet, quelle que soit sa
// nature, et au CM2 le sujet inversé ; les compléments ; les manipulations
// syntaxiques ; les classes de mots ; le groupe nominal ; les accords ; la
// conjugaison, et le temps des verbes d'un court texte ; au CM2, la phrase
// complexe. Les consignes sont écrites à la première personne ; ce qu'il
// faut savoir va dans un rappel, qui ne s'imprime que si l'on coche les
// aides (voir optionsFeuille.ts). Les prénoms sont inventés.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { choisir, entier } from "./nombres";
import { escapeHtml } from "./print";
import {
  VERBES_2E_GROUPE, VERBES_1ER_GROUPE_REGULIERS, VERBES_A_RADICAL_VARIABLE, VERBES_IRREGULIERS_CM, accorder, auTemps, conjugaisonCM, formesCM, marques,
  participe, sorteDuRadical, type TempsCM,
} from "./conjugaisonCM";
import { PERSONNES, avecPronom } from "./conjugaison";

export type ExerciceGrammaireCM =
  | "interrogation" | "types-formes" | "sujet" | "complements" | "manipulations" | "pronoms" | "classes" | "determinants"
  | "groupe-nominal" | "accords-gn" | "sujet-verbe" | "participe" | "conjuguer" | "temps-verbes" | "marques" | "radicaux"
  | "negation-composee" | "pc-pqp" | "phrase-complexe" | "nature-fonction";

export const EXERCICES_GRAMMAIRE_CM: { id: ExerciceGrammaireCM; libelle: string }[] = [
  { id: "types-formes", libelle: "Les types et les formes de phrases" },
  { id: "interrogation", libelle: "Poser une question de trois façons" },
  { id: "sujet", libelle: "Le sujet, quelle que soit sa nature" },
  { id: "complements", libelle: "Les compléments du verbe et de la phrase" },
  { id: "manipulations", libelle: "Déplacer, supprimer, remplacer, encadrer" },
  { id: "pronoms", libelle: "Les pronoms personnels sujets et compléments" },
  { id: "classes", libelle: "Les classes de mots" },
  { id: "determinants", libelle: "Les déterminants" },
  { id: "groupe-nominal", libelle: "Le groupe nominal : le nom noyau, ses expansions" },
  { id: "accords-gn", libelle: "La chaîne d'accords dans le groupe nominal" },
  { id: "sujet-verbe", libelle: "L'accord du sujet et du verbe" },
  { id: "participe", libelle: "L'accord du participe passé" },
  { id: "conjuguer", libelle: "Conjuguer" },
  { id: "temps-verbes", libelle: "Le temps et l'infinitif des verbes d'un texte" },
  { id: "marques", libelle: "Le radical, la marque de temps, la marque de personne" },
  { id: "radicaux", libelle: "Les verbes dont le radical change" },
  { id: "negation-composee", libelle: "La négation aux temps composés" },
  { id: "pc-pqp", libelle: "Passé composé ou plus-que-parfait (CM2)" },
  { id: "phrase-complexe", libelle: "Phrase simple ou phrase complexe (CM2)" },
  { id: "nature-fonction", libelle: "Nature et fonction (CM2)" },
];

export interface ReglagesGrammaireCM { classe: "CM1" | "CM2"; exercices: ExerciceGrammaireCM[]; combien: number; temps?: TempsCM[]; titre?: string }
export const REGLAGES_GRAMMAIRE_CM: ReglagesGrammaireCM = { classe: "CM1", exercices: ["sujet"], combien: 6 };

/** Un exercice : sa consigne, à la première personne ; ce qu'il faut savoir, à part ; la feuille de l'élève, la correction. */
interface Bloc { consigne: string; rappel?: string; corps: string; corrige: string }
type Alea = () => number;
const TROU = '<span class="gm-trou"></span>';
const TRAIT = '<span class="gm-trait"></span>';
/** Une ligne d'écriture jusqu'au bout de la page, après son étiquette : de quoi récrire une phrase entière. */
const ligne = (etiquette = "") => `<div class="gm-ligne">${etiquette ? `<span>${etiquette}</span>` : ""}<span class="gm-trait gm-long"></span></div>`;
/** Deux réponses sur la même ligne : la nature et la fonction. */
const ligneDouble = (a: string, b: string) => `<div class="gm-ligne"><span>${a}</span><span class="gm-trait gm-long"></span><span>${b}</span><span class="gm-trait gm-long"></span></div>`;
const lignes = (items: string[]) => `<div class="gm-lignes">${items.map((x) => `<div>${x}</div>`).join("")}</div>`;
/** Un tableau à remplir : une case vide est à écrire. */
const tableau = (entetes: string[], rangees: string[][]) =>
  `<table class="gm-tableau"><thead><tr>${entetes.map((e) => `<th>${e}</th>`).join("")}</tr></thead><tbody>${rangees.map((r) => `<tr>${r.map((c) => (c === "" ? '<td class="gm-vide"></td>' : `<td>${c}</td>`)).join("")}</tr>`).join("")}</tbody></table>`;
const nombre = (r: ReglagesGrammaireCM, max = 8) => Math.max(2, Math.min(max, r.combien));
/** Les mots entre crochets soulignés : « Elle [les] offre » → « Elle <u>les</u> offre ». */
const crochets = (t: string) => escapeHtml(t).replace(/\[([^\]]+)\]/g, "<u>$1</u>");

// ── Le corpus de phrases ──────────────────────────────────────────────────

/** Les fonctions : S sujet, V verbe, COD, COI, CCT/CCL/CCC complément circonstanciel de temps, de lieu, de cause, ATT attribut du sujet. */
type Fonction = "S" | "V" | "COD" | "COI" | "CCT" | "CCL" | "CCC" | "ATT";
/** La nature d'un groupe, pour le CM2. */
type Nature = "groupe nominal" | "pronom" | "nom propre" | "adjectif" | "groupe nominal prépositionnel" | "verbe" | "nom" | "noms coordonnés";
interface Groupe { mots: string; f: Fonction; n: Nature; pronom?: string }
interface PhraseAnalysee { groupes: Groupe[]; fin?: string; cm2?: boolean; inversion?: boolean }

const g = (mots: string, f: Fonction, n: Nature, pronom?: string): Groupe => ({ mots, f, n, pronom });
const PHRASES: PhraseAnalysee[] = [
  { groupes: [g("Le jardinier", "S", "groupe nominal", "Il"), g("arrose", "V", "verbe"), g("les rosiers", "COD", "groupe nominal", "les"), g("chaque matin", "CCT", "groupe nominal")] },
  { groupes: [g("Mon frère", "S", "groupe nominal", "Il"), g("parle", "V", "verbe"), g("à sa voisine", "COI", "groupe nominal prépositionnel", "lui")] },
  { groupes: [g("Les élèves", "S", "groupe nominal", "Ils"), g("écoutent", "V", "verbe"), g("une histoire", "COD", "groupe nominal", "l'"), g("dans la bibliothèque", "CCL", "groupe nominal prépositionnel")] },
  { groupes: [g("Ce soir", "CCT", "groupe nominal"), g("nous", "S", "pronom"), g("regarderons", "V", "verbe"), g("les étoiles", "COD", "groupe nominal", "les")] },
  { groupes: [g("Le chien", "S", "groupe nominal", "Il"), g("obéit", "V", "verbe"), g("à Noé", "COI", "groupe nominal prépositionnel", "lui")] },
  { groupes: [g("Les enfants", "S", "groupe nominal", "Ils"), g("pensent", "V", "verbe"), g("à leurs vacances", "COI", "groupe nominal prépositionnel")] },
  { groupes: [g("Léa et Tom", "S", "noms coordonnés", "Ils"), g("construisent", "V", "verbe"), g("une cabane", "COD", "groupe nominal", "la"), g("dans la forêt", "CCL", "groupe nominal prépositionnel")] },
  { groupes: [g("Il", "S", "pronom"), g("téléphone", "V", "verbe"), g("à sa grand-mère", "COI", "groupe nominal prépositionnel", "lui"), g("le dimanche", "CCT", "groupe nominal")] },
  { groupes: [g("À cause de la pluie", "CCC", "groupe nominal prépositionnel"), g("les joueurs", "S", "groupe nominal", "ils"), g("rentrent", "V", "verbe"), g("au vestiaire", "CCL", "groupe nominal prépositionnel")] },
  { groupes: [g("Le boulanger", "S", "groupe nominal", "Il"), g("prépare", "V", "verbe"), g("le pain", "COD", "groupe nominal", "le"), g("pendant la nuit", "CCT", "groupe nominal prépositionnel")] },
  { groupes: [g("Nous", "S", "pronom"), g("avons rangé", "V", "verbe"), g("nos cahiers", "COD", "groupe nominal", "les")] },
  { groupes: [g("Grâce à son courage", "CCC", "groupe nominal prépositionnel"), g("le pompier", "S", "groupe nominal", "il"), g("sauve", "V", "verbe"), g("le chaton", "COD", "groupe nominal", "le")] },
  { groupes: [g("Les hirondelles", "S", "groupe nominal", "Elles"), g("partent", "V", "verbe"), g("en automne", "CCT", "groupe nominal prépositionnel")] },
  { groupes: [g("Les touristes", "S", "groupe nominal", "Ils"), g("admirent", "V", "verbe"), g("le paysage", "COD", "groupe nominal", "l'"), g("depuis le sommet", "CCL", "groupe nominal prépositionnel")] },
  { groupes: [g("Tous les matins", "CCT", "groupe nominal"), g("Malik", "S", "nom propre", "il"), g("promène", "V", "verbe"), g("son chien", "COD", "groupe nominal", "le"), g("au parc", "CCL", "groupe nominal prépositionnel")] },
  { groupes: [g("Le facteur", "S", "groupe nominal", "Il"), g("apporte", "V", "verbe"), g("une lettre", "COD", "groupe nominal", "l'")] },
  { groupes: [g("Ma sœur", "S", "groupe nominal", "Elle"), g("ressemble", "V", "verbe"), g("à notre mère", "COI", "groupe nominal prépositionnel", "lui")] },
  { groupes: [g("Je", "S", "pronom"), g("rêve", "V", "verbe"), g("de voyages", "COI", "groupe nominal prépositionnel")] },
  { groupes: [g("Les spectateurs", "S", "groupe nominal", "Ils"), g("applaudissent", "V", "verbe"), g("les danseurs", "COD", "groupe nominal", "les"), g("à la fin du spectacle", "CCT", "groupe nominal prépositionnel")] },
  { groupes: [g("Zoé, Lina et Sacha", "S", "noms coordonnés", "Ils"), g("préparent", "V", "verbe"), g("un spectacle", "COD", "groupe nominal", "le")] },
  { groupes: [g("Elle", "S", "pronom"), g("lit", "V", "verbe"), g("un roman", "COD", "groupe nominal", "le"), g("sur la plage", "CCL", "groupe nominal prépositionnel")] },
  { groupes: [g("Nous", "S", "pronom"), g("jouons", "V", "verbe"), g("aux cartes", "COI", "groupe nominal prépositionnel"), g("après le repas", "CCT", "groupe nominal prépositionnel")] },
  { groupes: [g("Pendant les vacances", "CCT", "groupe nominal prépositionnel"), g("Basile", "S", "nom propre", "il"), g("a visité", "V", "verbe"), g("un château", "COD", "groupe nominal", "l'")] },
  { groupes: [g("Les oiseaux", "S", "groupe nominal", "Ils"), g("chantent", "V", "verbe"), g("dans les arbres", "CCL", "groupe nominal prépositionnel")] },
  { groupes: [g("Le petit chat", "S", "groupe nominal", "Il"), g("boit", "V", "verbe"), g("son lait", "COD", "groupe nominal", "le"), g("dans la cuisine", "CCL", "groupe nominal prépositionnel")] },
  // L'attribut du sujet, au CM2.
  { cm2: true, groupes: [g("Ma tante", "S", "groupe nominal", "Elle"), g("est", "V", "verbe"), g("infirmière", "ATT", "nom")] },
  { cm2: true, groupes: [g("Le ciel", "S", "groupe nominal", "Il"), g("devient", "V", "verbe"), g("gris", "ATT", "adjectif")] },
  { cm2: true, groupes: [g("Ces pommes", "S", "groupe nominal", "Elles"), g("semblent", "V", "verbe"), g("mûres", "ATT", "adjectif")] },
  { cm2: true, groupes: [g("Ce chanteur", "S", "groupe nominal", "Il"), g("est", "V", "verbe"), g("célèbre", "ATT", "adjectif")] },
  { cm2: true, groupes: [g("Mon père", "S", "groupe nominal", "Il"), g("reste", "V", "verbe"), g("calme", "ATT", "adjectif")] },
  { cm2: true, groupes: [g("En automne", "CCT", "groupe nominal prépositionnel"), g("les feuilles", "S", "groupe nominal", "elles"), g("deviennent", "V", "verbe"), g("rouges", "ATT", "adjectif")] },
  // Le sujet inversé, au CM2.
  { cm2: true, inversion: true, groupes: [g("Dans la forêt", "CCL", "groupe nominal prépositionnel"), g("vivait", "V", "verbe"), g("un vieux loup", "S", "groupe nominal")] },
  { cm2: true, inversion: true, groupes: [g("Sous le pont", "CCL", "groupe nominal prépositionnel"), g("coule", "V", "verbe"), g("une rivière", "S", "groupe nominal")] },
  { cm2: true, inversion: true, groupes: [g("Au bord du chemin", "CCL", "groupe nominal prépositionnel"), g("poussent", "V", "verbe"), g("des coquelicots", "S", "groupe nominal")] },
  { cm2: true, groupes: [g("À cause du brouillard", "CCC", "groupe nominal prépositionnel"), g("l'avion", "S", "groupe nominal", "il"), g("reste", "V", "verbe"), g("au sol", "CCL", "groupe nominal prépositionnel")] },
  { cm2: true, groupes: [g("Grâce au soleil", "CCC", "groupe nominal prépositionnel"), g("les tomates", "S", "groupe nominal", "elles"), g("mûrissent", "V", "verbe"), g("dans le jardin", "CCL", "groupe nominal prépositionnel")] },
];

/**
 * La phrase écrite : la majuscule au premier groupe, la minuscule aux autres —
 * sauf les noms propres —, une virgule après un complément circonstanciel en
 * tête ; chaque groupe peut être habillé (souligné, étiqueté).
 */
function ecrirePhrase(p: PhraseAnalysee, habiller: (x: Groupe, texte: string) => string = (_x, t) => escapeHtml(t)): string {
  const propre = (x: Groupe) => x.n === "nom propre" || x.n === "noms coordonnés";
  const t = p.groupes.map((x, i) => habiller(x, i === 0 ? x.mots.charAt(0).toUpperCase() + x.mots.slice(1) : propre(x) ? x.mots : x.mots.charAt(0).toLowerCase() + x.mots.slice(1)));
  return t.map((x, i) => (i === 0 && /^CC/.test(p.groupes[0].f) && !p.inversion ? `${x},` : x)).join(" ") + (p.fin ?? ".");
}
const NOMS_FONCTIONS: Record<Fonction, string> = {
  S: "sujet", V: "verbe", COD: "complément d'objet direct", COI: "complément d'objet indirect",
  CCT: "complément circonstanciel de temps", CCL: "complément circonstanciel de lieu", CCC: "complément circonstanciel de cause", ATT: "attribut du sujet",
};
const phrasesDe = (r: ReglagesGrammaireCM) => PHRASES.filter((p) => r.classe === "CM2" || !p.cm2);
/** Au CM2, d'abord quelques phrases du CM2, puis les autres : le corpus se complexifie. */
const auMoins = <T,>(alea: Alea, propres: T[], autres: T[], combien: number, n: number) =>
  melanger(alea, [...melanger(alea, propres).slice(0, combien), ...melanger(alea, autres)].slice(0, n));

// ── La phrase : types, formes, interrogation ─────────────────────────────

const TYPES_FORMES: [string, string, string][] = [
  ["Range ta chambre.", "impératif", "affirmative"], ["Ne cours pas dans le couloir.", "impératif", "négative"],
  ["Le train part à huit heures.", "déclaratif", "affirmative"], ["Il n'a pas compris la question.", "déclaratif", "négative"],
  ["As-tu fini ton dessin ?", "interrogatif", "affirmative"], ["Que cette montagne est haute !", "déclaratif", "exclamative"],
  ["Pourquoi ne viens-tu pas ?", "interrogatif", "négative"], ["Comme ce gâteau est bon !", "déclaratif", "exclamative"],
  ["Écoutez bien la consigne.", "impératif", "affirmative"], ["Nous ne partirons jamais sans toi.", "déclaratif", "négative"],
];
const NEGATIONS: [string, string][] = [
  ["Il a compris la leçon.", "Il n'a pas compris la leçon."], ["Nous sommes allés au cinéma.", "Nous ne sommes pas allés au cinéma."],
  ["Tu as fini ton travail.", "Tu n'as pas fini ton travail."], ["Elle a pris son parapluie.", "Elle n'a pas pris son parapluie."],
  ["Vous avez vu ce film.", "Vous n'avez pas vu ce film."], ["Ils sont venus hier.", "Ils ne sont pas venus hier."],
];

function typesFormes(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const items = melanger(alea, TYPES_FORMES).slice(0, nombre(r, 6));
  const neg = melanger(alea, NEGATIONS).slice(0, 3);
  const entetes = ["Phrase", "Type", "Forme"];
  return {
    consigne: "J'écris le type et la forme de chaque phrase. Puis je mets les trois dernières phrases à la forme négative.",
    rappel: "Les trois types de phrases : déclaratif, interrogatif, impératif. Les formes : affirmative ou négative ; exclamative.",
    corps: tableau(entetes, items.map(([p]) => [escapeHtml(p), "", ""])) + lignes(neg.map(([p]) => `${escapeHtml(p)}${ligne()}`)),
    corrige: tableau(entetes, items.map(([p, t, f]) => [escapeHtml(p), `<b>${t}</b>`, `<b>${f}</b>`])) + lignes(neg.map(([p, n]) => `${escapeHtml(p)} → <b>${escapeHtml(n)}</b>`)),
  };
}

/** Une phrase et ses trois questions : l'intonation, « est-ce que », l'inversion du sujet — avec le -t- euphonique. */
const INTERROGATIONS: { phrase: string; intonation: string; estCeQue: string; inversion: string; cm2?: boolean }[] = [
  { phrase: "Tu viens avec nous.", intonation: "Tu viens avec nous ?", estCeQue: "Est-ce que tu viens avec nous ?", inversion: "Viens-tu avec nous ?" },
  { phrase: "Il mange des fruits.", intonation: "Il mange des fruits ?", estCeQue: "Est-ce qu'il mange des fruits ?", inversion: "Mange-t-il des fruits ?" },
  { phrase: "Elle aime le chocolat.", intonation: "Elle aime le chocolat ?", estCeQue: "Est-ce qu'elle aime le chocolat ?", inversion: "Aime-t-elle le chocolat ?" },
  { phrase: "Vous comprenez la consigne.", intonation: "Vous comprenez la consigne ?", estCeQue: "Est-ce que vous comprenez la consigne ?", inversion: "Comprenez-vous la consigne ?" },
  { phrase: "Vous avez compris.", intonation: "Vous avez compris ?", estCeQue: "Est-ce que vous avez compris ?", inversion: "Avez-vous compris ?" },
  { phrase: "Il a terminé son travail.", intonation: "Il a terminé son travail ?", estCeQue: "Est-ce qu'il a terminé son travail ?", inversion: "A-t-il terminé son travail ?" },
  { phrase: "Nous partons demain.", intonation: "Nous partons demain ?", estCeQue: "Est-ce que nous partons demain ?", inversion: "Partons-nous demain ?" },
  { phrase: "Elle jouera du piano.", intonation: "Elle jouera du piano ?", estCeQue: "Est-ce qu'elle jouera du piano ?", inversion: "Jouera-t-elle du piano ?" },
  // Au CM2, le sujet nom repris par un pronom après le verbe, comme dans les exemples de réussite.
  { cm2: true, phrase: "Le facteur est passé.", intonation: "Le facteur est passé ?", estCeQue: "Est-ce que le facteur est passé ?", inversion: "Le facteur est-il passé ?" },
  { cm2: true, phrase: "La directrice viendra avec nous.", intonation: "La directrice viendra avec nous ?", estCeQue: "Est-ce que la directrice viendra avec nous ?", inversion: "La directrice viendra-t-elle avec nous ?" },
  { cm2: true, phrase: "La chorale chantera ce soir.", intonation: "La chorale chantera ce soir ?", estCeQue: "Est-ce que la chorale chantera ce soir ?", inversion: "La chorale chantera-t-elle ce soir ?" },
  { cm2: true, phrase: "Tes cousins arrivent demain.", intonation: "Tes cousins arrivent demain ?", estCeQue: "Est-ce que tes cousins arrivent demain ?", inversion: "Tes cousins arrivent-ils demain ?" },
];

function interrogation(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const cm2 = r.classe === "CM2";
  const n = nombre(r, 5);
  const items = cm2 ? auMoins(alea, INTERROGATIONS.filter((x) => x.cm2), INTERROGATIONS.filter((x) => !x.cm2), 2, n) : melanger(alea, INTERROGATIONS.filter((x) => !x.cm2)).slice(0, n);
  return {
    consigne: "Je transforme chaque phrase en question, de trois façons : par l'intonation, avec « est-ce que », puis en inversant le sujet.",
    rappel: `Trois façons de poser une question : Tu viens ? Est-ce que tu viens ? Viens-tu ? Quand le verbe finit par une voyelle, j'ajoute -t- : Mange-t-il des fruits ?${cm2 ? " Quand le sujet est un nom, un pronom le reprend après le verbe : Le facteur est-il passé ?" : ""}`,
    corps: lignes(items.map((x) => `${escapeHtml(x.phrase)}${ligne("1.")}${ligne("2.")}${ligne("3.")}`)),
    corrige: lignes(items.map((x) => `${escapeHtml(x.phrase)} → <b>${escapeHtml(x.intonation)}</b> ; <b>${escapeHtml(x.estCeQue)}</b> ; <b>${escapeHtml(x.inversion)}</b>`)),
  };
}

// ── Le sujet et les compléments ──────────────────────────────────────────

const souligner = (p: PhraseAnalysee, quels: (x: Groupe) => boolean, etiquette: (x: Groupe) => string) =>
  ecrirePhrase(p, (x, t) => (quels(x) ? `<u>${escapeHtml(t)}</u>${etiquette(x) ? `<sub class="gm-etiquette">${etiquette(x)}</sub>` : ""}` : escapeHtml(t)));

function sujet(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const cm2 = r.classe === "CM2";
  const n = nombre(r, 8);
  // Au CM2, au moins deux sujets inversés.
  const choisies = cm2 ? auMoins(alea, phrasesDe(r).filter((p) => p.inversion), phrasesDe(r).filter((p) => !p.inversion), 2, n) : melanger(alea, phrasesDe(r)).slice(0, n);
  const natureDuSujet = (x: Groupe) => (x.n === "pronom" ? "un pronom personnel" : x.n === "nom propre" ? "un nom propre" : x.n === "noms coordonnés" ? "plusieurs noms" : "un groupe nominal");
  return {
    consigne: "Je souligne le verbe conjugué en rouge et le groupe sujet en bleu. Puis j'écris la nature du sujet.",
    rappel: `Pour trouver le sujet, je l'encadre par « c'est … qui » ou je le remplace par un pronom. Le sujet peut être un pronom personnel, un nom propre, un groupe nominal ou plusieurs noms.${cm2 ? " Il peut être placé après le verbe : Sous le pont coule une rivière." : ""}`,
    corps: lignes(choisies.map((p) => `${ecrirePhrase(p)}${ligne("Nature du sujet :")}`)),
    corrige: lignes(choisies.map((p) => { const s = p.groupes.find((x) => x.f === "S")!; return `${souligner(p, (x) => x.f === "S" || x.f === "V", (x) => (x.f === "S" ? "sujet" : "verbe"))} — <b>${natureDuSujet(s)}</b>${p.inversion ? " (sujet inversé)" : ""}`; })),
  };
}

function complements(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const cm2 = r.classe === "CM2";
  const avecComplement = phrasesDe(r).filter((p) => p.groupes.some((x) => /^(COD|COI|CC.|ATT)$/.test(x.f)));
  const choisies = cm2 ? auMoins(alea, avecComplement.filter((p) => p.cm2), avecComplement.filter((p) => !p.cm2), 3, nombre(r, 7)) : melanger(alea, avecComplement).slice(0, nombre(r, 7));
  const nom = (f: Fonction) => (cm2 ? NOMS_FONCTIONS[f] : /^CC/.test(f) ? "complément circonstanciel" : NOMS_FONCTIONS[f]);
  return {
    consigne: cm2
      ? "Je souligne chaque complément. Puis j'écris sa fonction : COD, COI, attribut du sujet, complément circonstanciel de temps, de lieu ou de cause."
      : "Je souligne chaque complément. Puis j'écris sa fonction : COD, COI ou complément circonstanciel.",
    rappel: `Le complément d'objet direct (COD) suit le verbe sans préposition ; le complément d'objet indirect (COI) est introduit par à ou de. Le complément circonstanciel se déplace et se supprime ; le complément d'objet, non.${cm2 ? " Le complément circonstanciel dit quand, où ou pourquoi. L'attribut du sujet suit un verbe comme être, devenir, sembler, rester : il dit comment est le sujet." : ""}`,
    corps: lignes(choisies.map((p) => `${ecrirePhrase(p)}${ligne()}`)),
    corrige: lignes(choisies.map((p) => souligner(p, (x) => /^(COD|COI|CC.|ATT)$/.test(x.f), (x) => (cm2 ? x.f.replace("ATT", "attribut") : /^CC/.test(x.f) ? "CC" : x.f)) + ` — ${p.groupes.filter((x) => /^(COD|COI|CC.|ATT)$/.test(x.f)).map((x) => `<b>${escapeHtml(x.mots)}</b> : ${nom(x.f)}`).join(" ; ")}`)),
  };
}

function manipulations(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const avecCC = melanger(alea, phrasesDe(r).filter((p) => !p.inversion && p.groupes.some((x) => /^CC/.test(x.f)))).slice(0, 3);
  const avecS = melanger(alea, phrasesDe(r).filter((p) => !avecCC.includes(p) && !p.inversion && p.groupes[0].f === "S" && p.groupes[0].pronom)).slice(0, 2);
  const deplace = (p: PhraseAnalysee) => {
    const cc = p.groupes.find((x) => /^CC/.test(x.f))!;
    const autres = p.groupes.filter((x) => x !== cc);
    return cc === p.groupes[0] ? ecrirePhrase({ groupes: [...autres, cc] }) : ecrirePhrase({ groupes: [cc, ...autres] });
  };
  // On supprime le même complément que celui qu'on a déplacé.
  const supprime = (p: PhraseAnalysee) => { const cc = p.groupes.find((x) => /^CC/.test(x.f))!; return ecrirePhrase({ groupes: p.groupes.filter((x) => x !== cc) }); };
  return {
    consigne: "Je déplace le complément circonstanciel, puis je le supprime. J'encadre le sujet par « c'est … qui », puis je le remplace par un pronom.",
    rappel: "Le complément circonstanciel se déplace et se supprime : la phrase garde son sens. Le sujet s'encadre par « c'est … qui » et se remplace par un pronom.",
    corps: lignes([...avecCC.map((p) => `${ecrirePhrase(p)}${ligne("Déplacé :")}${ligne("Supprimé :")}`),
      ...avecS.map((p) => `${ecrirePhrase(p)}${ligne("C'est … qui :")}${ligne("Avec un pronom :")}`)]),
    corrige: lignes([...avecCC.map((p) => `${ecrirePhrase(p)} → <b>${deplace(p)}</b> ; <b>${supprime(p)}</b>`),
      ...avecS.map((p) => {
        const s = p.groupes[0], reste = p.groupes.slice(1), propre = s.n === "nom propre" || s.n === "noms coordonnés";
        const cest = /^(ils|elles)$/i.test(s.pronom ?? "") ? "Ce sont" : "C'est";
        return `${ecrirePhrase(p)} → <b>${cest} ${escapeHtml(propre ? s.mots : s.mots.charAt(0).toLowerCase() + s.mots.slice(1))} qui ${escapeHtml(reste.map((x) => x.mots).join(" "))}.</b> ; <b>${ecrirePhrase({ groupes: [{ ...s, n: "pronom", mots: s.pronom! }, ...reste] })}</b>`;
      })]),
  };
}

// ── Les pronoms ───────────────────────────────────────────────────────────

/** Au CM2, le pronom complément et ce qu'il remplace, d'une phrase à l'autre (exemples de réussite : « leur antécédent »). */
const ANTECEDENTS: [string, string, string][] = [
  ["Léa a cueilli des fleurs. Elle [les] offre à sa mère.", "les", "des fleurs"],
  ["Tom a perdu son ballon. Il [le] cherche partout.", "le", "son ballon"],
  ["Ma grand-mère arrive demain. Je [lui] prépare une surprise.", "lui", "ma grand-mère"],
  ["Les élèves écoutent la directrice. Ils [la] remercient.", "la", "la directrice"],
  ["Nos voisins partent en vacances. Nous [leur] gardons le chat.", "leur", "nos voisins"],
  ["Sacha a écrit une lettre. Il [l']envoie à son cousin.", "l'", "une lettre"],
];

/** Le complément d'objet remplacé par un pronom, devant le verbe : le, la, l', les ; au CM2, lui et leur. */
function pronoms(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const cm2 = r.classe === "CM2";
  const avecObjet = melanger(alea, phrasesDe(r).filter((p) => !p.inversion && p.groupes.some((x) => (x.f === "COD" || (cm2 && x.f === "COI")) && x.pronom) && p.groupes.find((x) => x.f === "V")!.mots.split(" ").length === 1)).slice(0, nombre(r, cm2 ? 5 : 6));
  const remplace = (p: PhraseAnalysee) => {
    const obj = p.groupes.find((x) => (x.f === "COD" || (cm2 && x.f === "COI")) && x.pronom)!;
    const v = p.groupes.find((x) => x.f === "V")!;
    const pr = obj.pronom === "l'" ? "l'" : `${obj.pronom} `;
    return ecrirePhrase({ groupes: p.groupes.filter((x) => x !== obj).map((x) => (x === v ? { ...x, mots: `${pr}${v.mots}` } : x)) });
  };
  const ante = cm2 ? melanger(alea, ANTECEDENTS).slice(0, 3) : [];
  return {
    consigne: cm2
      ? "Je remplace le complément souligné par un pronom personnel complément : le, la, l', les, lui ou leur. Je le place devant le verbe. Puis j'écris ce que remplace chaque pronom souligné des dernières phrases."
      : "Je remplace le complément d'objet direct souligné par un pronom personnel complément : le, la, l' ou les. Je le place devant le verbe.",
    rappel: `Les pronoms personnels sujets : je, tu, il, elle, nous, vous, ils, elles. Les pronoms personnels compléments le, la, l', les remplacent un COD : Il arrose les rosiers → Il les arrose.${cm2 ? " Lui et leur remplacent un COI introduit par à : Il parle à sa voisine → Il lui parle." : ""}`,
    corps: lignes(avecObjet.map((p) => `${souligner(p, (x) => (x.f === "COD" || (cm2 && x.f === "COI")) && !!x.pronom, () => "")}${ligne()}`))
      + (ante.length ? lignes(ante.map(([t, pr]) => `${crochets(t)}${ligne(`« ${escapeHtml(pr)} » remplace :`)}`)) : ""),
    corrige: lignes(avecObjet.map((p) => `${ecrirePhrase(p)} → <b>${remplace(p)}</b>`))
      + (ante.length ? lignes(ante.map(([t, pr, a]) => `${crochets(t)} — « ${escapeHtml(pr)} » remplace <b>${escapeHtml(a)}</b>`)) : ""),
  };
}

// ── Les classes de mots ───────────────────────────────────────────────────

type Classe = "nom" | "verbe" | "adjectif" | "article défini" | "article indéfini" | "déterminant possessif" | "déterminant démonstratif" | "adverbe"
  | "conjonction de coordination" | "pronom personnel sujet" | "pronom personnel complément" | "préposition" | "conjonction de subordination";
const PHRASES_MOTS: { mots: [string, Classe][]; cm2?: boolean }[] = [
  { mots: [["Le", "article défini"], ["chat", "nom"], ["de", "préposition"], ["ma", "déterminant possessif"], ["voisine", "nom"], ["dort", "verbe"], ["souvent", "adverbe"], ["sur", "préposition"], ["ce", "déterminant démonstratif"], ["fauteuil", "nom"]] },
  { mots: [["Une", "article indéfini"], ["fillette", "nom"], ["et", "conjonction de coordination"], ["son", "déterminant possessif"], ["frère", "nom"], ["mangent", "verbe"], ["des", "article indéfini"], ["cerises", "nom"], ["mais", "conjonction de coordination"], ["ils", "pronom personnel sujet"], ["laissent", "verbe"], ["les", "article défini"], ["noyaux", "nom"]] },
  { mots: [["Cette", "déterminant démonstratif"], ["maison", "nom"], ["est", "verbe"], ["très", "adverbe"], ["ancienne", "adjectif"]] },
  { mots: [["Nous", "pronom personnel sujet"], ["partirons", "verbe"], ["demain", "adverbe"], ["avec", "préposition"], ["nos", "déterminant possessif"], ["amis", "nom"]] },
  { mots: [["Le", "article défini"], ["lion", "nom"], ["rugit", "verbe"], ["car", "conjonction de coordination"], ["il", "pronom personnel sujet"], ["a", "verbe"], ["faim", "nom"]] },
  { mots: [["Ces", "déterminant démonstratif"], ["enfants", "nom"], ["jouent", "verbe"], ["toujours", "adverbe"], ["dans", "préposition"], ["la", "article défini"], ["cour", "nom"]] },
  { mots: [["Mon", "déterminant possessif"], ["cousin", "nom"], ["la", "pronom personnel complément"], ["regarde", "verbe"], ["puis", "adverbe"], ["il", "pronom personnel sujet"], ["lui", "pronom personnel complément"], ["sourit", "verbe"]] },
  { mots: [["Tu", "pronom personnel sujet"], ["prends", "verbe"], ["ton", "déterminant possessif"], ["manteau", "nom"], ["ou", "conjonction de coordination"], ["ton", "déterminant possessif"], ["écharpe", "nom"]] },
  { cm2: true, mots: [["Quand", "conjonction de subordination"], ["la", "article défini"], ["cloche", "nom"], ["sonne", "verbe"], ["les", "article défini"], ["élèves", "nom"], ["rangent", "verbe"], ["leurs", "déterminant possessif"], ["affaires", "nom"]] },
  { cm2: true, mots: [["Il", "pronom personnel sujet"], ["reste", "verbe"], ["à", "préposition"], ["la", "article défini"], ["maison", "nom"], ["parce qu'", "conjonction de subordination"], ["il", "pronom personnel sujet"], ["est", "verbe"], ["malade", "adjectif"]] },
  { cm2: true, mots: [["Si", "conjonction de subordination"], ["tu", "pronom personnel sujet"], ["les", "pronom personnel complément"], ["invites", "verbe"], ["mes", "déterminant possessif"], ["amis", "nom"], ["viendront", "verbe"], ["sans", "préposition"], ["hésiter", "verbe"]] },
];
const motsDe = (p: { mots: [string, Classe][] }) => p.mots.map(([m]) => m).join(" ").replace(/' /g, "'").replace(/^./, (c) => c.toUpperCase()) + ".";

function classes(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const cm2 = r.classe === "CM2";
  const combien = Math.max(1, Math.min(3, Math.ceil(r.combien / 2)));
  const choisies = cm2 ? auMoins(alea, PHRASES_MOTS.filter((p) => p.cm2), PHRASES_MOTS.filter((p) => !p.cm2), 1, combien) : melanger(alea, PHRASES_MOTS.filter((p) => !p.cm2)).slice(0, combien);
  const colonnes: Classe[] = cm2
    ? ["nom", "verbe", "adjectif", "article défini", "article indéfini", "déterminant possessif", "déterminant démonstratif", "pronom personnel sujet", "pronom personnel complément", "adverbe", "préposition", "conjonction de coordination", "conjonction de subordination"]
    : ["nom", "verbe", "adjectif", "article défini", "article indéfini", "déterminant possessif", "déterminant démonstratif", "pronom personnel sujet", "pronom personnel complément", "adverbe", "conjonction de coordination"];
  const table = (p: (typeof choisies)[number], corrige: boolean) => tableau(["Mot", "Classe"], p.mots.filter(([, c]) => colonnes.includes(c)).map(([m, c]) => [escapeHtml(m), corrige ? `<b>${escapeHtml(c)}</b>` : ""]));
  return {
    consigne: "J'écris la classe de chaque mot. Je choisis dans la liste.",
    corps: `<div class="gm-banque">${colonnes.map(escapeHtml).join(" · ")}</div>` + choisies.map((p) => `<div class="gm-phrase">${escapeHtml(motsDe(p))}</div>${table(p, false)}`).join(""),
    corrige: choisies.map((p) => `<div class="gm-phrase">${escapeHtml(motsDe(p))}</div>${table(p, true)}`).join(""),
  };
}

/** Les déterminants : leurs variations, et mon amie, pas « ma amie ». */
const DETERMINANTS: [string, string, string][] = [
  ["___ amie (à moi)", "mon amie", "devant une voyelle, ma devient mon"], ["___ école (à moi)", "mon école", "devant une voyelle, ma devient mon"],
  ["___ arbres (démonstratif)", "ces arbres", "ce, cet, cette, ces"], ["___ oiseau (démonstratif)", "cet oiseau", "devant une voyelle, ce devient cet"],
  ["___ fleur (démonstratif)", "cette fleur", "au féminin, cette"], ["___ livres (à toi)", "tes livres", "mon, ton, son ; ma, ta, sa ; mes, tes, ses"],
  ["___ maison (à eux)", "leur maison", "leur, leurs"], ["___ jouets (à eux)", "leurs jouets", "leur, leurs"],
  ["___ histoire (à elle)", "son histoire", "devant une voyelle, sa devient son"], ["___ table (article défini)", "la table", "le, la, l', les"],
];
function determinants(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const items = melanger(alea, DETERMINANTS).slice(0, nombre(r, 8));
  return {
    consigne: "Je complète avec le déterminant demandé.",
    rappel: "Les articles : le, la, l', les ; un, une, des. Les déterminants possessifs : mon, ton, son, ma, ta, sa, mes, tes, ses, notre, votre, leur, nos, vos, leurs. Les déterminants démonstratifs : ce, cet, cette, ces. Devant une voyelle, ma devient mon (mon amie) et ce devient cet (cet oiseau).",
    corps: lignes(items.map(([q]) => `${escapeHtml(q).replace("___", TROU)}`)), corrige: lignes(items.map(([q, rep, pq]) => `${escapeHtml(q)} : <b>${escapeHtml(rep)}</b> — ${escapeHtml(pq)}`)),
  };
}

// ── Le groupe nominal ─────────────────────────────────────────────────────

/** Des groupes nominaux, leur nom noyau, leurs expansions : l'adjectif épithète ; au CM2, le complément du nom. */
const GROUPES_NOMINAUX: { gn: string; noyau: string; epithetes: string[]; complement?: string; cm2?: boolean }[] = [
  { gn: "un petit chien noir", noyau: "chien", epithetes: ["petit", "noir"] }, { gn: "la grande maison", noyau: "maison", epithetes: ["grande"] },
  { gn: "des fleurs jaunes", noyau: "fleurs", epithetes: ["jaunes"] }, { gn: "une vieille barque", noyau: "barque", epithetes: ["vieille"] },
  { gn: "ces longues journées", noyau: "journées", epithetes: ["longues"] }, { gn: "mon cartable", noyau: "cartable", epithetes: [] },
  { cm2: true, gn: "une tasse de thé", noyau: "tasse", epithetes: [], complement: "de thé" }, { cm2: true, gn: "le vélo rouge de mon frère", noyau: "vélo", epithetes: ["rouge"], complement: "de mon frère" },
  { cm2: true, gn: "une robe à fleurs", noyau: "robe", epithetes: [], complement: "à fleurs" }, { cm2: true, gn: "la porte du garage", noyau: "porte", epithetes: [], complement: "du garage" },
  { cm2: true, gn: "un joli panier en osier", noyau: "panier", epithetes: ["joli"], complement: "en osier" },
];
const EPITHETE_OU_ATTRIBUT: [string, string, string][] = [
  ["Le ciel gris annonce la pluie.", "gris", "épithète"], ["Le ciel devient gris.", "gris", "attribut du sujet"],
  ["Ces pommes mûres sont sucrées.", "mûres", "épithète"], ["Ces pommes semblent mûres.", "mûres", "attribut du sujet"],
  ["Mon père reste calme.", "calme", "attribut du sujet"], ["Un chat calme dort au soleil.", "calme", "épithète"],
];
function groupeNominal(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const cm2 = r.classe === "CM2";
  const n = nombre(r, 6);
  const gns = cm2 ? auMoins(alea, GROUPES_NOMINAUX.filter((x) => x.cm2), GROUPES_NOMINAUX.filter((x) => !x.cm2), 3, n) : melanger(alea, GROUPES_NOMINAUX.filter((x) => !x.cm2)).slice(0, n);
  const ea = cm2 ? melanger(alea, EPITHETE_OU_ATTRIBUT).slice(0, 4) : [];
  const entetes = cm2 ? ["Groupe nominal", "Nom noyau", "Adjectifs épithètes", "Complément du nom"] : ["Groupe nominal", "Nom noyau", "Adjectifs épithètes"];
  return {
    consigne: cm2
      ? "Pour chaque groupe nominal, j'écris le nom noyau, les adjectifs épithètes et le complément du nom. Puis j'écris si l'adjectif est épithète ou attribut du sujet."
      : "Pour chaque groupe nominal, j'écris le nom noyau, puis les adjectifs épithètes.",
    rappel: `Le nom noyau est le nom principal du groupe nominal. L'adjectif épithète le complète, avant ou après lui : un petit chien noir.${cm2 ? " Le complément du nom est introduit par une préposition : une tasse de thé. L'adjectif attribut du sujet est relié au sujet par un verbe comme être : Le ciel devient gris." : ""}`,
    corps: tableau(entetes, gns.map((x) => [escapeHtml(x.gn), "", "", ...(cm2 ? [""] : [])]))
      + (ea.length ? lignes(ea.map(([p, a]) => `${escapeHtml(p)} « ${escapeHtml(a)} » est : ${TRAIT}`)) : ""),
    corrige: tableau(entetes, gns.map((x) => [escapeHtml(x.gn), `<b>${escapeHtml(x.noyau)}</b>`, `<b>${x.epithetes.length ? escapeHtml(x.epithetes.join(", ")) : "aucun"}</b>`, ...(cm2 ? [`<b>${escapeHtml(x.complement ?? "aucun")}</b>`] : [])]))
      + (ea.length ? lignes(ea.map(([p, a, f]) => `${escapeHtml(p)} « ${escapeHtml(a)} » est <b>${f}</b>`)) : ""),
  };
}

// ── Les accords ───────────────────────────────────────────────────────────

/** Des groupes nominaux réguliers à transformer : un petit ours, une petite ourse, des petits ours. */
const NOMS_REGULIERS: [string, string][] = [["ours", "ourse"], ["ami", "amie"], ["voisin", "voisine"], ["cousin", "cousine"], ["marchand", "marchande"], ["client", "cliente"], ["avocat", "avocate"]];
const ADJECTIFS_REGULIERS: [string, string][] = [["petit", "petite"], ["grand", "grande"], ["joli", "jolie"], ["content", "contente"], ["fort", "forte"], ["prudent", "prudente"]];
const pluriel = (m: string) => (/[sx]$/.test(m) ? m : `${m}s`);
/** Au CM2, des variations particulières, en lien avec l'orthographe lexicale : -al, -eau, -eu au pluriel ; -eur, -if, -er, -teur au féminin. */
const VARIATIONS_PARTICULIERES: [string, string, string, string][] = [
  ["un animal sauvage", "au pluriel", "des animaux sauvages", "-al devient -aux"],
  ["un journal local", "au pluriel", "des journaux locaux", "-al devient -aux, pour le nom comme pour l'adjectif"],
  ["un bateau blanc", "au pluriel", "des bateaux blancs", "-eau prend un x"],
  ["un cheveu blond", "au pluriel", "des cheveux blonds", "-eu prend un x"],
  ["un château ancien", "au pluriel", "des châteaux anciens", "-eau prend un x"],
  ["un chanteur heureux", "au féminin", "une chanteuse heureuse", "-eur et -eux deviennent -euse"],
  ["un sportif actif", "au féminin", "une sportive active", "-if devient -ive"],
  ["un boulanger fier", "au féminin", "une boulangère fière", "-er devient -ère"],
  ["un acteur célèbre", "au féminin", "une actrice célèbre", "-teur devient -trice"],
  ["un agriculteur courageux", "au féminin", "une agricultrice courageuse", "-teur devient -trice ; -eux devient -euse"],
];
function accordsGN(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const items = Array.from({ length: nombre(r, 6) }, () => {
    const [nm, nf] = choisir(alea, NOMS_REGULIERS), [am, af] = choisir(alea, ADJECTIFS_REGULIERS);
    const avant = ["petit", "grand", "joli"].includes(am);
    const gn = (det: string, n: string, a: string) => (avant ? `${det} ${a} ${n}` : `${det} ${n} ${a}`);
    return { depart: gn("un", nm, am), fem: gn("une", nf, af), plm: gn("des", pluriel(nm), pluriel(am)), plf: gn("des", pluriel(nf), pluriel(af)), nf, af };
  });
  const uniques = items.filter((x, i) => items.findIndex((y) => y.depart === x.depart) === i);
  const particulieres = r.classe === "CM2" ? melanger(alea, VARIATIONS_PARTICULIERES).slice(0, 4) : [];
  const entetes = ["Masculin singulier", "Féminin singulier", "Masculin pluriel", "Féminin pluriel"];
  const modele = uniques[0];
  return {
    consigne: `Je transforme chaque groupe nominal. Puis je justifie une transformation.${particulieres.length ? " Enfin, je transforme les derniers groupes comme demandé." : ""}`,
    rappel: `Le nom noyau donne son genre et son nombre au déterminant et à l'adjectif : un petit ours, une petite ourse, des petits ours.${particulieres.length ? " Certains mots changent davantage : un animal, des animaux ; un acteur, une actrice." : ""}`,
    corps: tableau(entetes, uniques.map((x) => [escapeHtml(x.depart), "", "", ""])) + ligne("Je justifie :") + ligne()
      + (particulieres.length ? lignes(particulieres.map(([d, c]) => `${escapeHtml(d)}, ${c}${ligne()}`)) : ""),
    corrige: tableau(entetes, uniques.map((x) => [escapeHtml(x.depart), `<b>${escapeHtml(x.fem)}</b>`, `<b>${escapeHtml(x.plm)}</b>`, `<b>${escapeHtml(x.plf)}</b>`]))
      + lignes([`Par exemple : « ${escapeHtml(modele.fem)} » — le nom noyau « ${escapeHtml(modele.nf)} » est au féminin singulier, donc le déterminant « une » et l'adjectif « ${escapeHtml(modele.af)} » aussi.`])
      + (particulieres.length ? lignes(particulieres.map(([d, c, rep, pq]) => `${escapeHtml(d)}, ${c} : <b>${escapeHtml(rep)}</b> — ${escapeHtml(pq)}`)) : ""),
  };
}

/** L'accord du sujet et du verbe : le nom noyau du groupe sujet, plusieurs noms ; et une élève, il élève. */
const SUJETS_VERBES: [string, string, string, string, string][] = [
  ["Les enfants de la voisine", "jouent", "joue", "au ballon.", "le noyau est « enfants », au pluriel"], ["Le chat de mes voisins", "dort", "dorment", "sur le muret.", "le noyau est « chat », au singulier"],
  ["Léa et son frère", "partent", "part", "en vacances.", "deux noms : c'est un sujet pluriel"], ["La boîte de crayons", "tombe", "tombent", "par terre.", "le noyau est « boîte »"],
  ["Les feuilles de l'arbre", "tombent", "tombe", "en automne.", "le noyau est « feuilles »"], ["Le bruit des vagues", "berce", "bercent", "les promeneurs.", "le noyau est « bruit »"],
  ["Tom, Nour et Jade", "chantent", "chante", "dans la chorale.", "trois noms : c'est un sujet pluriel"], ["Le panier de pommes", "pèse", "pèsent", "trois kilos.", "le noyau est « panier »"],
];
const HOMONYMES: [string, string, string][] = [
  ["Une élève lit à voix haute.", "élève", "nom"], ["Le berger élève des moutons.", "élève", "verbe"],
  ["Tu ranges ta chambre.", "ranges", "verbe"], ["Les rangs sont droits.", "rangs", "nom"],
  ["Elles portent des sacs.", "portent", "verbe"], ["Les portes sont fermées.", "portes", "nom"],
];
/** Au CM2 : le sujet placé après le verbe ; l'attribut accordé avec le sujet. */
const SUJETS_INVERSES: [string, string, string, string, string][] = [
  ["Dans la forêt", "vivaient", "vivait", "des loups.", "le sujet « des loups », placé après le verbe, est au pluriel"],
  ["Sous le pont", "coule", "coulent", "une rivière.", "le sujet « une rivière », placé après le verbe, est au singulier"],
  ["Au bord du chemin", "poussent", "pousse", "des coquelicots.", "le sujet « des coquelicots » est au pluriel"],
  ["Sur la colline", "se dresse", "se dressent", "un vieux moulin.", "le sujet « un vieux moulin » est au singulier"],
  ["Au fond du jardin", "dorment", "dort", "deux chats.", "le sujet « deux chats » est au pluriel"],
  ["Dans le ciel", "brillent", "brille", "les étoiles.", "le sujet « les étoiles » est au pluriel"],
];
const ATTRIBUTS: [string, string, string, string][] = [
  ["Ces pommes semblent", "mûr", "mûres", "le sujet « ces pommes » est au féminin pluriel"],
  ["Les nuits deviennent", "froid", "froides", "le sujet « les nuits » est au féminin pluriel"],
  ["Ma tante est", "content", "contente", "le sujet « ma tante » est au féminin singulier"],
  ["Les élèves restent", "attentif", "attentifs", "le sujet « les élèves » est au pluriel"],
  ["Cette histoire paraît", "vrai", "vraie", "le sujet « cette histoire » est au féminin singulier"],
  ["Les rues sont", "désert", "désertes", "le sujet « les rues » est au féminin pluriel"],
];
function sujetVerbe(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const cm2 = r.classe === "CM2";
  const items = melanger(alea, SUJETS_VERBES).slice(0, nombre(r, cm2 ? 4 : 6));
  const inverses = cm2 ? melanger(alea, SUJETS_INVERSES).slice(0, 3) : [];
  const attributs = cm2 ? melanger(alea, ATTRIBUTS).slice(0, 3) : [];
  const ordre = [...items, ...inverses].map(() => alea() < 0.5);
  const formes = (bonne: string, autre: string, i: number) => (ordre[i] ? `${bonne} / ${autre}` : `${autre} / ${bonne}`);
  const homos = melanger(alea, HOMONYMES).slice(0, 4);
  const sousLigne = (p: string, m: string) => escapeHtml(p).replace(escapeHtml(m), `<u>${escapeHtml(m)}</u>`);
  return {
    consigne: `J'entoure la forme du verbe qui s'accorde avec le sujet.${cm2 ? " J'écris l'adjectif attribut, accordé avec le sujet." : ""} Puis j'écris si le mot souligné est un nom ou un verbe.`,
    rappel: `Le verbe s'accorde avec le nom noyau du groupe sujet ; plusieurs noms font un sujet pluriel. Un nom et un verbe peuvent s'écrire de la même façon : une élève, des élèves ; il élève, elles élèvent.${cm2 ? " Le sujet peut être placé après le verbe : Dans la forêt vivaient des loups. L'attribut s'accorde avec le sujet : Ces pommes semblent mûres." : ""}`,
    corps: lignes([...items.map((x, i) => `${escapeHtml(x[0])} (${escapeHtml(formes(x[1], x[2], i))}) ${escapeHtml(x[3])}`),
      ...inverses.map((x, i) => `${escapeHtml(x[0])} (${escapeHtml(formes(x[1], x[2], items.length + i))}) ${escapeHtml(x[3])}`),
      ...attributs.map(([s, a]) => `${escapeHtml(s)} (${escapeHtml(a)}) → ${TRAIT}`)])
      + lignes(homos.map(([p, m]) => `${sousLigne(p, m)} : ${TRAIT}`)),
    corrige: lignes([...items.map((x) => `${escapeHtml(x[0])} <b>${escapeHtml(x[1])}</b> ${escapeHtml(x[3])} — ${escapeHtml(x[4])}`),
      ...inverses.map((x) => `${escapeHtml(x[0])} <b>${escapeHtml(x[1])}</b> ${escapeHtml(x[3])} — ${escapeHtml(x[4])}`),
      ...attributs.map(([s, , rep, pq]) => `${escapeHtml(s)} <b>${escapeHtml(rep)}</b> — ${escapeHtml(pq)}`)])
      + lignes(homos.map(([p, m, n]) => `${sousLigne(p, m)} : <b>${n}</b>`)),
  };
}

/** Le participe passé : avec être, il s'accorde avec le sujet ; au CM2, avec avoir, avec le COD placé avant le verbe. */
function participePasse(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const cm2 = r.classe === "CM2";
  const sujets: [string, boolean, boolean][] = [["Les filles", true, true], ["Ma sœur", true, false], ["Les garçons", false, true], ["Mon cousin", false, false], ["Léa et Zoé", true, true], ["Tom et Lina", false, true]];
  const verbesEtre = ["arriver", "tomber", "rester", "entrer", "aller", "venir"];
  const avecEtre: { texte: string; reponse: string }[] = [];
  for (let garde = 0; avecEtre.length < nombre(r, 5) && garde < 100; garde++) {
    const [s, f, p] = choisir(alea, sujets), v = choisir(alea, verbesEtre);
    const texte = `${s} ${p ? "sont" : "est"} (${v})`;
    if (!avecEtre.some((x) => x.texte === texte)) avecEtre.push({ texte, reponse: `${s} ${p ? "sont" : "est"} ${accorder(participe(v), f, p)}` });
  }
  const avecAvoir = cm2 ? melanger(alea, [
    ["Les pommes que j'ai (acheter)", "Les pommes que j'ai achetées", "le COD « que », mis pour « les pommes », est placé avant"],
    ["La tarte que Léa a (préparer)", "La tarte que Léa a préparée", "le COD « que » est placé avant"],
    ["Ces dessins, je les ai (faire)", "Ces dessins, je les ai faits", "le COD « les » est placé avant"],
    ["Les photos que nous avons (prendre)", "Les photos que nous avons prises", "le COD « que » est placé avant"],
    ["Léa a (préparer) une tarte.", "Léa a préparé une tarte.", "le COD est placé après : pas d'accord"],
    ["Les films que tu as (voir)", "Les films que tu as vus", "le COD « que » est placé avant"],
    ["Nous avons (finir) nos exercices.", "Nous avons fini nos exercices.", "le COD est placé après : pas d'accord"],
  ] as [string, string, string][]).slice(0, 4) : [];
  return {
    consigne: "J'écris le participe passé du verbe entre parenthèses, et je l'accorde s'il le faut.",
    rappel: `Avec l'auxiliaire être, le participe passé s'accorde avec le sujet : -e au féminin, -s au pluriel. Les filles sont arrivées.${cm2 ? " Avec avoir, il s'accorde avec le COD seulement si celui-ci est placé avant le verbe : Les pommes que j'ai achetées." : ""}`,
    corps: lignes([...avecEtre.map((x) => escapeHtml(x.texte)), ...avecAvoir.map(([t]) => escapeHtml(t))].map((t) => `${t} → ${TRAIT}`)),
    corrige: lignes([...avecEtre.map((x) => `<b>${escapeHtml(x.reponse)}</b>`), ...avecAvoir.map(([, rep, pq]) => `<b>${escapeHtml(rep)}</b> — ${escapeHtml(pq)}`)]),
  };
}

// ── La conjugaison ────────────────────────────────────────────────────────

const VERBES_DU_CM = () => ["être", "avoir", ...VERBES_1ER_GROUPE_REGULIERS.slice(0, 10), ...VERBES_2E_GROUPE, ...VERBES_IRREGULIERS_CM];
function tempsDe(r: ReglagesGrammaireCM): TempsCM[] {
  if (r.temps?.length) return r.temps;
  return r.classe === "CM2" ? ["passeSimple", "plusQueParfait"] : ["present", "imparfait", "futur", "passeCompose"];
}

function conjuguer(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const temps = tempsDe(r);
  const verbes = melanger(alea, VERBES_DU_CM()).slice(0, Math.max(2, Math.min(4, Math.ceil(r.combien / 2))));
  const tableaux = verbes.map((v, i) => ({ v, t: temps[i % temps.length] }));
  const conj = (v: string, t: TempsCM, corrige: boolean) => `<div class="gm-conj"><div class="gm-conj-titre">${escapeHtml(v)} ${auTemps(t)}</div>${PERSONNES.map((p, k) => {
    const forme = conjugaisonCM(v, t)[k];
    return `<div>${corrige ? `<b>${escapeHtml(forme)}</b>` : `${escapeHtml(/^j'/.test(forme) ? "j'" : p)} ${TRAIT}`}</div>`;
  }).join("")}</div>`;
  return {
    consigne: "Je conjugue chaque verbe au temps demandé, à toutes les personnes. Je peux m'aider de mes outils de référence.",
    corps: `<div class="gm-conjs">${tableaux.map((x) => conj(x.v, x.t, false)).join("")}</div>`,
    corrige: `<div class="gm-conjs">${tableaux.map((x) => conj(x.v, x.t, true)).join("")}</div>`,
  };
}

/** De courts textes dont les verbes soulignés sont à des temps différents : le temps et l'infinitif de chacun. */
type Morceau = string | [string, string, string];
const TEXTES_TEMPS: { cm2?: boolean; morceaux: Morceau[] }[] = [
  { morceaux: ["Quand j'", ["étais", "imparfait", "être"], " petit, je ", ["voulais", "imparfait", "vouloir"], " devenir pilote. Aujourd'hui, je ", ["suis", "présent", "être"],
    " boulanger. Hier, j'", ["ai vendu", "passé composé", "vendre"], " trois cents baguettes. Demain, je ", ["ferai", "futur", "faire"], " des croissants pour toute la ville."] },
  { morceaux: ["Chaque été, Nour ", ["partait", "imparfait", "partir"], " chez sa grand-mère. Elle y ", ["restait", "imparfait", "rester"], " un mois. Cette année, elle ",
    ["a choisi", "passé composé", "choisir"], " la colonie de vacances. Elle ", ["reviendra", "futur", "revenir"], " en août et elle nous ", ["racontera", "futur", "raconter"], " tout."] },
  { morceaux: ["Les hirondelles ", ["sont arrivées", "passé composé", "arriver"], " hier. Elles ", ["construisent", "présent", "construire"], " leur nid sous le toit. L'an dernier, elles ",
    ["étaient", "imparfait", "être"], " déjà là. Bientôt, les petits ", ["sortiront", "futur", "sortir"], " du nid."] },
  { morceaux: ["Ce matin, nous ", ["avons visité", "passé composé", "visiter"], " une ferme. Le fermier ", ["élève", "présent", "élever"], " des vaches. Enfant, il ",
    ["aidait", "imparfait", "aider"], " déjà son père. Plus tard, sa fille ", ["dirigera", "futur", "diriger"], " la ferme."] },
  { cm2: true, morceaux: ["Le loup ", ["avait marché", "plus-que-parfait", "marcher"], " toute la nuit. Il ", ["arriva", "passé simple", "arriver"], " au village au lever du jour. Les maisons ",
    ["étaient", "imparfait", "être"], " silencieuses. Il ", ["vit", "passé simple", "voir"], " une lumière et ", ["frappa", "passé simple", "frapper"], " à la porte."] },
  { cm2: true, morceaux: ["Ce jour-là, les enfants ", ["firent", "passé simple", "faire"], " une découverte. Ils ", ["jouaient", "imparfait", "jouer"], " près de la rivière quand Léa ",
    ["vit", "passé simple", "voir"], " un coffre. Quelqu'un l'", ["avait caché", "plus-que-parfait", "cacher"], " sous les racines d'un arbre."] },
  { cm2: true, morceaux: ["Le roi ", ["voulut", "passé simple", "vouloir"], " voir la mer. Il ", ["prit", "passé simple", "prendre"], " la route avec ses chevaliers. Ils ",
    ["marchaient", "imparfait", "marcher"], " depuis dix jours quand ils ", ["arrivèrent", "passé simple", "arriver"], " au rivage. Le roi ", ["resta", "passé simple", "rester"], " longtemps silencieux."] },
  { cm2: true, morceaux: ["Hier, Tom ", ["a retrouvé", "passé composé", "retrouver"], " le livre qu'il ", ["avait prêté", "plus-que-parfait", "prêter"], " à Sacha. Il le ",
    ["relira", "futur", "relire"], " pendant les vacances, car il l'", ["aime", "présent", "aimer"], " beaucoup."] },
];
function tempsVerbes(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const cm2 = r.classe === "CM2";
  const choisis = melanger(alea, TEXTES_TEMPS.filter((t) => !!t.cm2 === cm2)).slice(0, r.combien >= 6 ? 2 : 1);
  const texte = (t: (typeof choisis)[number]) => t.morceaux.map((m) => (typeof m === "string" ? escapeHtml(m) : `<u>${escapeHtml(m[0])}</u>`)).join("");
  const verbes = (t: (typeof choisis)[number]) => t.morceaux.filter((m): m is [string, string, string] => typeof m !== "string");
  const entetes = ["Verbe", "Temps", "Infinitif"];
  return {
    consigne: "Pour chaque verbe souligné, j'écris son temps et son infinitif.",
    rappel: cm2
      ? "Le passé simple : il arriva, ils firent. Le plus-que-parfait : l'auxiliaire être ou avoir à l'imparfait, puis le participe passé : il avait marché. Au passé composé, l'auxiliaire est au présent : il a retrouvé."
      : "Les temps étudiés : le présent, l'imparfait, le futur et le passé composé — l'auxiliaire être ou avoir au présent, puis le participe passé : j'ai vendu.",
    corps: choisis.map((t) => `<div class="gm-texte">${texte(t)}</div>${tableau(entetes, verbes(t).map(([v]) => [escapeHtml(v), "", ""]))}`).join(""),
    corrige: choisis.map((t) => `<div class="gm-texte">${texte(t)}</div>${tableau(entetes, verbes(t).map(([v, temps, inf]) => [escapeHtml(v), `<b>${temps}</b>`, `<b>${inf}</b>`]))}`).join(""),
  };
}

function marquesExercice(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const cm2 = r.classe === "CM2";
  const temps: ("imparfait" | "futur" | "passeSimple")[] = cm2 ? ["passeSimple", "passeSimple", "imparfait", "futur"] : ["imparfait", "futur"];
  const verbes = ["chanter", "finir", "jouer", "venir", "vouloir", "prendre", "grandir", "danser", "faire", "être"];
  const items = Array.from({ length: nombre(r, 6) }, (_, i) => {
    const t = temps[i % temps.length], v = choisir(alea, verbes), p = entier(alea, 0, 5);
    const forme = formesCM(v, t)[p], m = marques(v, t, p);
    return { forme: avecPronom(PERSONNES[p], forme), v, t, m };
  });
  return {
    consigne: `Je sépare par des tirets le radical, la marque de temps et la marque de personne : je chant-ai-s${cm2 ? " ; il v-in-t" : ""}.`,
    rappel: `À l'imparfait, la marque de temps est -ai- ou -i- : je chant-ai-s, nous chant-i-ons. Au futur, c'est -r- : je chante-r-ai, je fini-r-ai.${cm2 ? " Au passé simple : -ai, -a-, -â-, -è-, -i-, -î-, -u-, -û-, -in-, -în- : je chant-ai, nous chant-â-mes, ils chant-è-rent, il v-in-t." : ""}`,
    corps: lignes(items.map((x) => `${escapeHtml(x.forme)} (${escapeHtml(x.v)}, ${auTemps(x.t)}) : ${TRAIT}`)),
    corrige: lignes(items.map((x) => `${escapeHtml(x.forme)} : <b>${escapeHtml(x.m.radical)} - ${escapeHtml(x.m.temps)} - ${escapeHtml(x.m.personne || "∅")}</b>`)),
  };
}

/** Au CM2, les radicaux des verbes du troisième groupe, au présent (exemples de réussite : « les différentes formes du radical »). */
const RADICAUX_3E_GROUPE: Record<string, string[]> = {
  venir: ["vien-", "ven-", "vienn-"], prendre: ["prend-", "pren-", "prenn-"], pouvoir: ["peu-", "pouv-", "peuv-"], vouloir: ["veu-", "voul-", "veul-"], voir: ["voi-", "voy-"],
};
function radicaux(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const cm2 = r.classe === "CM2";
  const sortes = melanger(alea, Object.keys(VERBES_A_RADICAL_VARIABLE));
  const items = Array.from({ length: nombre(r, cm2 ? 4 : 6) }, (_, i) => {
    const sorte = sortes[i % sortes.length], v = choisir(alea, VERBES_A_RADICAL_VARIABLE[sorte]);
    const t: TempsCM = sorte === "é" || sorte === "-cer" || sorte === "-ger" ? "present" : choisir(alea, ["present", "futur"] as TempsCM[]);
    // Au présent, les personnes dont la terminaison est muette ; au futur, toutes.
    const p = sorte === "-cer" || sorte === "-ger" ? 3 : t === "present" ? choisir(alea, [0, 2, 5]) : choisir(alea, [0, 2, 3, 5]);
    return { v, t, p, forme: conjugaisonCM(v, t)[p], sorte };
  });
  const pourquoi: Record<string, string> = {
    "e muet": "le e devient è devant une syllabe muette", "é": "le é devient è devant une terminaison muette", "-yer": "le y devient i devant un e muet",
    "-eler, -eter": "appeler et jeter doublent leur consonne devant un e muet", "-cer": "le c prend une cédille devant a et o", "-ger": "le g garde un e devant a et o",
  };
  const troisieme = cm2 ? melanger(alea, Object.keys(RADICAUX_3E_GROUPE)).slice(0, 3) : [];
  const entetes = ["Verbe", "je", "nous", "ils", "Ses radicaux"];
  const presents = (v: string) => { const f = conjugaisonCM(v, "present"); return [f[0], f[3], f[5]]; };
  return {
    consigne: `Je conjugue le verbe à la personne et au temps demandés : son radical change.${cm2 ? " Puis je conjugue les verbes du tableau au présent, et j'écris leurs radicaux." : ""}`,
    rappel: `Certains verbes changent de radical : je lève, nous levons ; je cède, nous cédons ; je nettoie, nous nettoyons ; j'appelle, nous appelons ; nous commençons ; nous mangeons.${cm2 ? " Les verbes du troisième groupe aussi : je viens, nous venons, ils viennent." : ""}`,
    corps: lignes(items.map((x) => `${escapeHtml(x.v)}, ${auTemps(x.t)}, ${PERSONNES[x.p]} : ${TRAIT}`))
      + (troisieme.length ? tableau(entetes, troisieme.map((v) => [escapeHtml(v), "", "", "", ""])) : ""),
    corrige: lignes(items.map((x) => `${escapeHtml(x.v)}, ${auTemps(x.t)} : <b>${escapeHtml(x.forme)}</b> — ${escapeHtml(pourquoi[sorteDuRadical(x.v) ?? x.sorte])}`))
      + (troisieme.length ? tableau(entetes, troisieme.map((v) => [escapeHtml(v), ...presents(v).map((f) => `<b>${escapeHtml(f)}</b>`), `<b>${RADICAUX_3E_GROUPE[v].join(", ")}</b>`])) : ""),
  };
}

function negationComposee(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const cm2 = r.classe === "CM2";
  // Des sujets au masculin, que l'accord du participe avec être ne trahisse pas.
  const sujets: [string, number][] = [["Je", 0], ["Tu", 1], ["Il", 2], ["Nous", 3], ["Vous", 4], ["Ils", 5]];
  // Des verbes et leur complément : on n'écrit pas « il a pris » tout seul.
  const verbes: [string, string][] = [["finir", "le puzzle"], ["prendre", "le train"], ["voir", "ce film"], ["chanter", "la chanson"], ["aller", "au cinéma"], ["venir", "à la fête"], ["faire", "ce gâteau"], ["regarder", "les photos"]];
  const vus = new Set<string>();
  const items: { affirmative: string; negative: string }[] = [];
  for (let garde = 0; items.length < nombre(r, 6) && garde < 100; garde++) {
    const [s, p] = choisir(alea, sujets), [v, complement] = choisir(alea, verbes), t: TempsCM = cm2 && alea() < 0.5 ? "plusQueParfait" : "passeCompose";
    const [aux, ...part] = formesCM(v, t)[p].split(" ");
    const affirmative = `${avecPronom(s.toLowerCase(), formesCM(v, t)[p]).replace(/^./, (c) => c.toUpperCase())} ${complement}.`;
    if (vus.has(affirmative)) continue;
    vus.add(affirmative);
    const neg = /^[aeiouyéèêh]/i.test(aux) ? "n'" : "ne ";
    items.push({ affirmative, negative: `${s} ${neg}${aux} pas ${part.join(" ")} ${complement}.` });
  }
  return {
    consigne: "Je mets chaque phrase à la forme négative.",
    rappel: "Aux temps composés, ne … pas encadre l'auxiliaire : Il n'a pas compris. Nous ne sommes pas allés au cinéma.",
    corps: lignes(items.map((x) => `${escapeHtml(x.affirmative)}${ligne()}`)), corrige: lignes(items.map((x) => `${escapeHtml(x.affirmative)} → <b>${escapeHtml(x.negative)}</b>`)),
  };
}

function pcPqp(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const verbes = ["finir", "prendre", "voir", "chanter", "aller", "venir", "faire", "jouer", "arriver"];
  const items = Array.from({ length: nombre(r, 6) }, () => {
    const v = choisir(alea, verbes), p = entier(alea, 0, 5), t: TempsCM = alea() < 0.5 ? "passeCompose" : "plusQueParfait";
    return { forme: avecPronom(PERSONNES[p], formesCM(v, t)[p]), v, t };
  });
  return {
    consigne: "Pour chaque verbe, j'écris son temps — passé composé ou plus-que-parfait — et son infinitif.",
    rappel: "Le passé composé : l'auxiliaire au présent, puis le participe passé (j'ai chanté). Le plus-que-parfait : l'auxiliaire à l'imparfait, puis le participe passé (j'avais chanté).",
    corps: lignes(items.map((x) => `<div class="gm-ligne gm-fort"><span>${escapeHtml(x.forme)} :</span><span class="gm-trait gm-long"></span></div>`)),
    corrige: lignes(items.map((x) => `${escapeHtml(x.forme)} : <b>${x.t === "passeCompose" ? "passé composé" : "plus-que-parfait"}</b>, du verbe <b>${escapeHtml(x.v)}</b>`)),
  };
}

// ── La phrase complexe et la nature des groupes (CM2) ─────────────────────

const PHRASES_COMPLEXES: [string, string[], boolean][] = [
  ["Le chat dort sur le canapé.", ["dort"], false], ["Quand il pleut, nous restons à la maison.", ["pleut", "restons"], true],
  ["Le chien aboie et le chat s'enfuit.", ["aboie", "s'enfuit"], true], ["Je pense que tu as raison.", ["pense", "as"], true],
  ["Les oiseaux du jardin chantent dès le lever du soleil.", ["chantent"], false], ["Léa lit pendant que son frère dessine.", ["lit", "dessine"], true],
  ["Mes cousins arriveront demain matin.", ["arriveront"], false], ["Si tu viens, nous jouerons ensemble.", ["viens", "jouerons"], true],
];
/** Les verbes d'une phrase soulignés, mot entier : « as » dans « tu as raison », pas dans « Lucas ». */
const soulignerVerbes = (p: string, vs: string[]) => {
  const marque = vs.reduce((t, v) => t.replace(new RegExp(`(^|\\s)(${v})(?=[\\s.,!?])`), "$1\u0001$2\u0002"), p);
  return escapeHtml(marque).replace(/\u0001/g, "<u>").replace(/\u0002/g, "</u>");
};
function phraseComplexe(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const items = melanger(alea, PHRASES_COMPLEXES).slice(0, nombre(r, 6));
  return {
    consigne: "Je souligne les verbes conjugués. Puis j'écris si la phrase est simple ou complexe.",
    rappel: "Une phrase simple a un seul verbe conjugué ; une phrase complexe en a plusieurs. Des mots relient ses parties : et, mais, quand, si, que, pendant que…",
    corps: lignes(items.map(([p]) => `${escapeHtml(p)} ${TRAIT}`)),
    corrige: lignes(items.map(([p, vs, c]) => `${soulignerVerbes(p, vs)} <b>${c ? `complexe : ${vs.length} verbes conjugués` : "simple : un seul verbe conjugué"}</b>`)),
  };
}

function natureFonction(alea: Alea, r: ReglagesGrammaireCM): Bloc {
  const corpus = melanger(alea, PHRASES.filter((p) => p.groupes.length >= 3));
  const items = Array.from({ length: nombre(r, 6) }, (_, i) => {
    // Pas de groupe de noms coordonnés : sa nature n'est pas celle d'un groupe du programme.
    const p = corpus[i % corpus.length], x = choisir(alea, p.groupes.filter((y) => y.f !== "V" && y.n !== "noms coordonnés"));
    return { p, x };
  });
  return {
    consigne: "J'écris la nature et la fonction de chaque groupe souligné.",
    rappel: "La nature dit ce qu'est le groupe : nom, nom propre, groupe nominal, pronom, adjectif, groupe nominal prépositionnel. La fonction dit son rôle dans la phrase : sujet, COD, COI, attribut du sujet, complément circonstanciel. Une même nature peut avoir plusieurs fonctions.",
    corps: lignes(items.map(({ p, x }) => `${souligner(p, (y) => y === x, () => "")}${ligneDouble("Nature :", "Fonction :")}`)),
    corrige: lignes(items.map(({ p, x }) => `${souligner(p, (y) => y === x, () => "")} — <b>${x.n}</b>, <b>${NOMS_FONCTIONS[x.f]}</b>`)),
  };
}

const FABRIQUES: Record<ExerciceGrammaireCM, (alea: Alea, r: ReglagesGrammaireCM) => Bloc> = {
  "types-formes": typesFormes, interrogation, sujet, complements, manipulations, pronoms, classes, determinants,
  "groupe-nominal": groupeNominal, "accords-gn": accordsGN, "sujet-verbe": sujetVerbe, participe: participePasse,
  conjuguer, "temps-verbes": tempsVerbes, marques: marquesExercice, radicaux, "negation-composee": negationComposee, "pc-pqp": pcPqp,
  "phrase-complexe": phraseComplexe, "nature-fonction": natureFonction,
};

export function htmlGrammaireCM(r: ReglagesGrammaireCM, graine: number): string {
  const alea = hasard(graine);
  const titre = r.titre ?? "Étude de la langue";
  const exos: string[] = [], corriges: string[] = [];
  EXERCICES_GRAMMAIRE_CM.map((e) => e.id).filter((e) => r.exercices.includes(e)).forEach((ex, i) => {
    const b = FABRIQUES[ex](alea, { ...r, combien: Math.max(1, Math.min(10, r.combien)) });
    exos.push(`<div class="gm-exo"><div class="gm-consigne"><b>${i + 1}.</b> ${b.consigne}</div>${b.rappel ? `<div class="rappel">${b.rappel}</div>` : ""}${b.corps}</div>`);
    corriges.push(`<div class="gm-exo"><div class="gm-consigne"><b>${i + 1}.</b> ${b.consigne}</div>${b.corrige}</div>`);
  });
  return feuille(`<div class="page"><div class="titre">${escapeHtml(titre)}</div><div class="sous">Prénom : ........................................ Date : ........................</div>${exos.join("")}</div>
    <div class="page corrige"><div class="titre">${escapeHtml(titre)} — corrigé</div>${corriges.join("")}</div>`, "gm");
}

export const STYLE_GRAMMAIRE_CM = `
  .feuille.gm .gm-exo { margin: 0 0 6mm; }
  .feuille.gm .gm-consigne { font-size: 13px; margin-bottom: 3mm; break-after: avoid; page-break-after: avoid; break-inside: avoid; page-break-inside: avoid; }
  .feuille.gm .gm-lignes > div { font-size: 14.5px; margin: 0 0 3.5mm; line-height: 1.9; break-inside: avoid; page-break-inside: avoid; }
  .feuille.gm .gm-ligne { display: flex; align-items: flex-end; gap: 2mm; margin: 0.5mm 0 0 4mm; font-size: 13px; color: #4b5266; line-height: 1.4; }
  .feuille.gm .gm-ligne .gm-long { flex: 1; min-width: 25mm; height: 7.5mm; }
  .feuille.gm .gm-ligne.gm-fort { margin-left: 0; font-size: 14.5px; color: inherit; }
  .feuille.gm .gm-trou { display: inline-block; width: 22mm; height: 7mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; vertical-align: middle; }
  .feuille.gm .gm-trait { display: inline-block; min-width: 55mm; border-bottom: 1px dotted #9aa0b4; height: 6mm; vertical-align: bottom; }
  .feuille.gm .gm-etiquette { font-size: 9px; color: #d94033; margin-left: 0.6mm; }
  .feuille.gm u { text-decoration-thickness: 1.5px; text-underline-offset: 2px; }
  .feuille.gm .gm-phrase { font-size: 15px; margin: 0 0 2mm; }
  .feuille.gm .gm-texte { font-size: 15px; line-height: 2; margin: 0 0 3mm; }
  .feuille.gm .gm-banque { font-size: 12.5px; border: 1px solid #c4c9d6; border-radius: 2mm; padding: 1.5mm 3mm; margin: 0 0 3mm; line-height: 1.6; }
  .feuille.gm .gm-tableau { border-collapse: collapse; font-size: 13.5px; margin: 0 0 5mm; width: 100%; }
  .feuille.gm .gm-tableau th, .feuille.gm .gm-tableau td { border: 1px solid #9aa0b4; padding: 1.2mm 3mm; height: 7.5mm; text-align: left; }
  .feuille.gm .gm-tableau th { background: #f0f2f8; font-size: 12px; }
  .feuille.gm .gm-tableau tr { break-inside: avoid; page-break-inside: avoid; }
  .feuille.gm .gm-conjs { display: flex; flex-wrap: wrap; gap: 6mm; }
  .feuille.gm .gm-conj { border: 1px solid #c4c9d6; border-radius: 2mm; padding: 2mm 4mm; min-width: 70mm; font-size: 14px; line-height: 1.9; break-inside: avoid; page-break-inside: avoid; }
  .feuille.gm .gm-conj-titre { font-weight: 700; font-size: 13px; margin-bottom: 1mm; }
  .feuille.gm .gm-conj .gm-trait { min-width: 45mm; }
`;
