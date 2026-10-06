// La progression des correspondances graphèmes-phonèmes, du CP au CE1.
//
// Guide « Pour enseigner la lecture et l'écriture au CP » (2018), focus
// p. 67-74 : un exemple de progression, période par période, spiralaire —
// chaque leçon s'appuie sur les précédentes. Guide « Pour enseigner la lecture
// et l'écriture au CE1 » (2019), p. 12-16 : un exemple de progression pour
// consolider les graphèmes complexes en début d'année, chacun travaillé en
// syllabes, en mots et en pseudo-mots.
//
// Une étape dit ce qu'on étudie, ce qu'on entend, la rubrique du guide et les
// correspondances qu'elle fait apprendre. Ce qui a été vu jusque-là décide de
// ce que la grille de fluence peut donner à lire : le guide CP veut des
// syllabes et des mots faits des seules correspondances déjà étudiées.

import { decouper, structure, type Morceau } from "./decoupageCgp";
import { MOTS_DECHIFFRABLES } from "./motsDechiffrables";

export type Periode = 1 | 2 | 3 | 4 | 5 | "ce1";

const GUIDE_CP = "guide « Pour enseigner la lecture et l'écriture au CP » (2018), p. 67-74";
const GUIDE_CE1 = "guide « Pour enseigner la lecture et l'écriture au CE1 » (2019), p. 12-16";

export const PERIODES: { id: Periode; titre: string; court: string; guide: string }[] = [
  { id: 1, titre: "CP — période 1 (septembre-octobre)", court: "CP, période 1", guide: GUIDE_CP },
  { id: 2, titre: "CP — période 2 (novembre-décembre)", court: "CP, période 2", guide: GUIDE_CP },
  { id: 3, titre: "CP — période 3 (janvier-février)", court: "CP, période 3", guide: GUIDE_CP },
  { id: 4, titre: "CP — période 4 (mars-avril)", court: "CP, période 4", guide: GUIDE_CP },
  { id: 5, titre: "CP — période 5 (mai-juin)", court: "CP, période 5", guide: GUIDE_CP },
  { id: "ce1", titre: "CE1 — consolider les graphèmes complexes", court: "CE1, consolidation", guide: GUIDE_CE1 },
];
export const periodeDe = (id: Periode) => PERIODES.find((p) => p.id === id)!;

/** Un graphème qui ouvre la syllabe ; c et g ne vont que devant a, o, u (« fortes »), gu et ç devant e, i (« faibles ») ou l'inverse. */
type Attaque = string | { g: string; devant: "fortes" | "faibles" };

interface Gabarit {
  /** Le graphème ouvre la syllabe : ch → cha, cho, ché… devant les voyelles vues. */
  attaque?: Attaque[];
  /** Le graphème est le noyau : ou → lou, rou, fou… après les consonnes vues. */
  noyau?: string[];
  /** Des syllabes écrites pour l'étape ; celles qui demandent ce qu'on n'a pas vu tombent. */
  liste?: string[];
}

export interface EtapeCgp {
  id: string;
  periode: Periode;
  /** Ce qu'on étudie : « ch », « an, am ». */
  titre: string;
  /** Ce qu'on entend : « [ʃ] » ; vide pour une règle (lettres muettes, structures). */
  son: string;
  /** La rubrique du guide : « Consonnes fricatives 2 ». */
  rubrique: string;
  /** Les correspondances que l'étape fait apprendre, avec leur nom court. */
  cles: Record<string, string>;
  syllabes: Gabarit;
  /** Ce que le guide précise, redit en une phrase. */
  note?: string;
  /** La fin des pseudo-mots : « t » s'accroche à la voyelle, « -er » à une consonne (lumer, rivez). */
  fins?: string[];
  /** Un mot porte l'étape : par défaut, il demande l'une de ses correspondances. */
  porte?: (ms: Morceau[], mot: string) => boolean;
  /** Les révisions : tout ce que la période a fait apprendre. */
  revision?: boolean;
}

type Plus = Partial<Pick<EtapeCgp, "note" | "fins" | "porte">>;
const etape = (periode: Periode, id: string, titre: string, son: string, rubrique: string, cles: Record<string, string>, syllabes: Gabarit, plus: Plus = {}): EtapeCgp =>
  ({ id, periode, titre, son, rubrique, cles, syllabes, ...plus });
const revisions = (periode: 1 | 2 | 3 | 4 | 5): EtapeCgp =>
  ({ id: `p${periode}-revisions`, periode, titre: `Révisions de la période ${periode}`, son: "", rubrique: "Révisions", cles: {}, syllabes: {}, revision: true });
const aLaFois = (...cles: string[]) => (ms: Morceau[]) => cles.filter((c) => ms.some((m) => m.cle === c)).length >= 2;

/** Les étapes, dans l'ordre du guide CP puis du guide CE1. */
export const ETAPES: EtapeCgp[] = [
  // ── CP, période 1 ──
  etape(1, "p1-voyelles", "a, é, i, o, u", "", "Voyelles orales", { a: "a", é: "é", i: "i", o: "o", u: "u" },
    { liste: ["a", "é", "i", "o", "u"] }, { note: "En début d'année, les voyelles peuvent s'étudier deux par deux." }),
  etape(1, "p1-l", "l", "[l]", "Consonnes liquides", { l: "l" }, { attaque: ["l"] }),
  etape(1, "p1-r", "r", "[ʁ]", "Consonnes liquides", { r: "r" }, { attaque: ["r"] }),
  etape(1, "p1-f", "f", "[f]", "Consonnes fricatives 1", { f: "f" }, { attaque: ["f"] }),
  etape(1, "p1-j", "j", "[ʒ]", "Consonnes fricatives 1", { j: "j" }, { attaque: ["j"] }),
  etape(1, "p1-cv-vc", "CV et VC : li-il, ro-or", "", "Structures syllabiques niveau 1", { "structure-vc": "syllabe VC (il, or)" },
    { liste: ["li", "il", "lo", "ol", "la", "al", "lu", "ul", "ra", "ar", "ri", "ir", "ro", "or", "ru", "ur", "fa", "af", "fi", "if", "fo", "of"] },
    { porte: (ms) => structure(ms) === 1, note: "La consonne avant, puis après la voyelle : li-il, ro-or." }),
  etape(1, "p1-ou", "ou", "[u]", "Voyelles orales niveau 2 : deux lettres pour un son", { ou: "ou" }, { noyau: ["ou"], liste: ["oul", "our", "ouf"] }),
  etape(1, "p1-e", "e", "[ə]", "Voyelles orales niveau 2", { e: "e = [ə]" }, { noyau: ["e"] }, { note: "Le e de le, je, qui se lit « eu »." }),
  etape(1, "p1-eu", "eu", "[ø]", "Voyelles orales niveau 2", { eu: "eu" }, { noyau: ["eu"], liste: ["eul", "eur"] }),
  revisions(1),

  // ── CP, période 2 ──
  etape(2, "p2-cvc-ccv", "CVC et CCV : jour, fleur", "", "Structures syllabiques niveau 2", { "structure-cvc": "syllabe CVC ou CCV (jour, fleur)" },
    { liste: ["lur", "rol", "jor", "jol", "fal", "laf", "rif", "jeul", "jeur", "lour", "four", "fla", "fra", "flé", "flu", "fri", "fli", "freu", "flou", "frou", "fro"] },
    { porte: (ms) => structure(ms) === 2, note: "Une consonne de chaque côté de la voyelle (jour), ou deux consonnes devant elle (fleur)." }),
  etape(2, "p2-muettes", "lettres muettes : e, s, t, x, d", "", "Lettres muettes niveau 1 (fin de mots)",
    { "e-muet": "e muet", "s-muet": "s muet", "t-muet": "t muet", "x-muet": "x muet", "d-muet": "d muet", "z-muet": "z muet" },
    { liste: [] }, { fins: ["t", "s", "d", "-e"], note: "En fin de mot, on ne les entend pas : fée, lilas, lit, deux, lourd." }),
  etape(2, "p2-v", "v", "[v]", "Consonnes fricatives 2", { v: "v" }, { attaque: ["v"], liste: ["vra", "vri", "vro", "vrou", "var", "vol", "vour"] }),
  etape(2, "p2-ch", "ch", "[ʃ]", "Consonnes fricatives 2", { ch: "ch" }, { attaque: ["ch"], liste: ["char", "chol", "chour", "cheur"] }),
  etape(2, "p2-p", "p", "[p]", "Consonnes occlusives 1", { p: "p" }, { attaque: ["p"], liste: ["pla", "pli", "plou", "pra", "pri", "pro", "prou", "par", "pol", "pour"] }),
  etape(2, "p2-t", "t", "[t]", "Consonnes occlusives 1", { t: "t" }, { attaque: ["t"], liste: ["tra", "tri", "tro", "trou", "tar", "tor", "tour"] }),
  etape(2, "p2-b", "b", "[b]", "Consonnes occlusives 1", { b: "b" }, { attaque: ["b"], liste: ["bla", "bli", "blou", "bra", "bri", "bro", "bar", "bol", "bour"] }),
  etape(2, "p2-d", "d", "[d]", "Consonnes occlusives 1", { d: "d" }, { attaque: ["d"], liste: ["dra", "dri", "dro", "drou", "dar", "dor", "dour"] }),
  etape(2, "p2-b-d", "b / d, p / q", "", "Cas particulier 1 : les lettres miroirs", {},
    { liste: ["ba", "da", "bi", "di", "bo", "do", "bu", "du", "bou", "dou", "pa", "po", "pi", "pé", "bé", "dé"] },
    { porte: aLaFois("b", "d", "p"), note: "b et d, p et q se ressemblent dans un miroir : ba-da, bi-di, bou-dou." }),
  etape(2, "p2-m", "m", "[m]", "Consonnes nasales", { m: "m" }, { attaque: ["m"], liste: ["mar", "mol", "mour"] }),
  etape(2, "p2-n", "n", "[n]", "Consonnes nasales", { n: "n" }, { attaque: ["n"], liste: ["nar", "nol", "nour"] }),
  etape(2, "p2-gn", "gn", "[ɲ]", "Consonnes nasales", { gn: "gn" }, { attaque: ["gn"] }, { note: "gn ouvre la syllabe : li-gne, vi-gne." }),
  etape(2, "p2-z", "z", "[z]", "Consonnes fricatives 3", { z: "z" }, { attaque: ["z"] }),
  etape(2, "p2-s", "s, ss", "[s] [z]", "Consonnes fricatives 3", { s: "s", ss: "ss", "s-z": "s = [z]" },
    { attaque: ["s"], liste: ["asso", "issa", "osso", "aso", "isa", "ousé"] },
    { note: "s en début de mot (sol) et ss entre deux voyelles (chasseur) se lisent [s] ; s seul entre deux voyelles se lit [z] (rose)." }),
  etape(2, "p2-es", "es : les, mes, des", "[e]", "Cas particulier 2", { es: "es (les, mes)" }, { liste: ["les", "mes", "tes", "des", "ses"] }),
  revisions(2),

  // ── CP, période 3 ──
  etape(3, "p3-c-k", "c, k, qu", "[k]", "Consonnes occlusives 2", { "c-k": "c = [k]", k: "k", qu: "qu", q: "q" },
    { attaque: [{ g: "c", devant: "fortes" }, "k", "qu"], liste: ["cla", "cli", "clo", "cra", "cro", "cri", "crou", "car", "col", "cour"] },
    { note: "c se lit [k] devant a, o, ou, u ou une consonne : car, cou, clou." }),
  etape(3, "p3-g-gu", "g, gu", "[g]", "Consonnes occlusives 2", { g: "g = [g]", gu: "gu" },
    { attaque: [{ g: "g", devant: "fortes" }, { g: "gu", devant: "faibles" }], liste: ["gla", "glo", "gli", "gra", "gro", "gri", "grou", "gar", "gor", "gour"] },
    { note: "g devant a, o, ou, u ou une consonne ; gu devant e, é, è, i." }),
  etape(3, "p3-un", "un", "[œ̃]", "Voyelles nasales 1", { un: "un" }, { noyau: ["un"] }),
  etape(3, "p3-an", "an, am", "[ɑ̃]", "Voyelles nasales 1", { an: "an", am: "am" }, { noyau: ["an"] }, { note: "m devant m, p, b : ampoule, jambe." }),
  etape(3, "p3-en", "en, em", "[ɑ̃]", "Voyelles nasales 1", { en: "en", em: "em" }, { noyau: ["en"] },
    { note: "m devant m, p, b : décembre ; ent se lit [ɑ̃] dans dent, souvent, et les mots en -ment." }),
  etape(3, "p3-on", "on, om", "[ɔ̃]", "Voyelles nasales 1", { on: "on", om: "om" }, { noyau: ["on"] }, { note: "m devant m, p, b : ombre, bombe." }),
  etape(3, "p3-in", "in, im", "[ɛ̃]", "Voyelles nasales 1", { in: "in", im: "im" }, { noyau: ["in"] }, { note: "m devant m, p, b : timbre, grimpe." }),
  etape(3, "p3-oi", "oi", "[wa]", "Semi-consonnes 1", { oi: "oi" }, { noyau: ["oi"] }),
  etape(3, "p3-oin", "oin", "[wɛ̃]", "Semi-consonnes 1", { oin: "oin" }, { noyau: ["oin"] }),
  etape(3, "p3-ui", "u de lui", "[ɥi]", "Semi-consonnes 1", { ui: "ui (lui)" }, { noyau: ["ui"] }, { note: "lui, nuit, fuir, bruit." }),
  etape(3, "p3-y", "y = [i]", "[i]", "Voyelles orales 3", { "y-i": "y = [i]" },
    { liste: ["y", "ly", "ry", "fy", "py", "ty", "by", "dy", "my", "ny", "sy", "vy", "pyr", "tyl"] }, { note: "il y a, pyjama, stylo." }),
  etape(3, "p3-a", "à, â", "[a]", "Voyelles orales 4 : les différents a", { à: "à", â: "â" },
    { liste: ["à", "là", "â", "pâ", "lâ", "tâ", "câ", "mâ", "nâ", "bâ", "vâ", "châ", "râ", "gâ"] }),
  etape(3, "p3-au", "au, eau", "[o]", "Voyelles orales 5 : les différents o", { au: "au", eau: "eau" }, { noyau: ["au", "eau"] }),
  etape(3, "p3-oeu", "œu, œi, eu = [y]", "[œ] [y]", "Voyelles orales 6", { "œu": "œu", "œi": "œil", "eu-u": "eu = [y] (j'ai eu)" },
    { liste: ["œu", "sœu", "cœu", "bœu", "vœu", "nœu", "lœu", "rœu", "œuf"] }, { note: "œuf, sœur, cœur ; œil ; et eu de « j'ai eu », qui se lit [y]." }),
  etape(3, "p3-ent", "-ent muet : ils chantent", "", "La terminaison muette des verbes", { "ent-muet": "-ent muet" }, { liste: [] },
    { note: "Au pluriel des verbes, -ent ne se lit pas : ils chantent. Les verbes se lisent avec « ils »." }),
  etape(3, "p3-e-accents", "è, ê, ë", "[ɛ]", "Les différents e", { è: "è", ê: "ê", ë: "ë" }, { noyau: ["è", "ê"] }, { note: "élève, tête, Noël." }),
  revisions(3),

  // ── CP, période 4 ──
  etape(4, "p4-ell", "ell, ess, err, ett", "[ɛ]", "e suivi d'une double consonne", { "e-double": "e devant ll, ss, rr, tt" },
    { liste: ["ella", "esso", "erri", "ettou", "elle", "esse", "erre", "ette", "pella", "tesso", "verra", "bette", "nelle", "messe"] },
    { note: "e devant une consonne double se lit [ɛ] : belle, tresse, terre, galette." }),
  etape(4, "p4-er", "er, es, ec", "[ɛ]", "e suivi de deux consonnes", { "e-cc": "e devant deux consonnes" },
    { liste: ["per", "ter", "ver", "ber", "ser", "fer", "perto", "merli", "becto", "perlu", "terla"] },
    { note: "e devant deux consonnes se lit [ɛ] : merci, perte, geste, insecte." }),
  etape(4, "p4-ai", "ai, ei", "[ɛ]", "Voyelles orales", { ai: "ai", ei: "ei" }, { noyau: ["ai", "ei"] }),
  etape(4, "p4-finales", "er, ez, et en fin de mot", "[e] [ɛ]", "Finales en er, ez, et", { "er-final": "er final", ez: "ez", "et-final": "et final" },
    { liste: ["chez", "nez", "tez", "sez", "lez", "quet", "chet", "jet", "net", "let", "ret", "pet"] },
    { fins: ["-er", "-ez", "-et"], note: "chanter, nez, jouet : la consonne finale ne s'entend pas." }),
  etape(4, "p4-h", "h, th", "", "Lettre muette 2 : le h", { h: "h", th: "th" },
    { liste: ["ha", "hi", "ho", "hu", "hé", "hou", "heu", "han", "hon", "hin", "thé", "tha", "tho", "thi", "thou"] }, { note: "Le h ne se prononce pas : heure, habit, thé, cahier." }),
  etape(4, "p4-ph", "ph", "[f]", "Consonnes fricatives 4", { ph: "ph" }, { attaque: ["ph"] }),
  etape(4, "p4-c-s", "c, ç, s, sc", "[s]", "Consonnes fricatives 5 : les écritures de [s]", { "c-s": "c = [s]", ç: "ç", "s-ss": "s = [s] (ourson, veston)", sc: "sc" },
    { attaque: [{ g: "c", devant: "faibles" }, { g: "ç", devant: "fortes" }], liste: ["sci", "sce", "scé"] },
    { note: "c se lit [s] devant e, é, è, i, y ; ç devant a, o, u : garçon, leçon. Et s dans ourson, veston." }),
  etape(4, "p4-g-j", "g, ge", "[ʒ]", "Consonnes fricatives 5 : les écritures de [ʒ]", { "g-j": "g = [ʒ]", ge: "ge (pigeon)" },
    { attaque: [{ g: "g", devant: "faibles" }, { g: "ge", devant: "fortes" }] }, { note: "g se lit [ʒ] devant e, é, è, i, y ; ge devant a, o : pigeon." }),
  etape(4, "p4-i-yod", "i = [j]", "[j]", "Semi-consonnes 2 : le yod", { "i-yod": "i = [j]" },
    { liste: ["ia", "io", "ié", "iè", "ieu", "ion", "ian", "lia", "lio", "rio", "pia", "pié", "pio", "bio", "dia", "fia", "mio", "nia", "vio", "tia"] },
    { note: "Devant une voyelle, i se lit [j] : ciel, pied, lion." }),
  etape(4, "p4-x", "x", "[ks] [gz]", "Cas particuliers 3 : le x", { "x-ks": "x = [ks]", "x-gz": "x = [gz]" },
    { liste: ["xa", "xi", "xo", "xé", "xu", "axa", "exa", "exi", "exo", "oxo", "uxa", "ixo"] },
    { note: "[ks] le plus souvent : taxi, boxe ; [gz] après ex devant une voyelle : examen, exemple." }),
  etape(4, "p4-ain", "ain, aim, ein, yn, ym, um", "[ɛ̃] [œ̃]", "Voyelles nasales 2", { ain: "ain", aim: "aim", ein: "ein", yn: "yn", ym: "ym", um: "um" },
    { noyau: ["ain", "ein"], liste: ["faim", "daim", "syn", "sym", "lyn", "tyn", "fum", "lum", "rum"] },
    { note: "pain, faim, plein, symbole ; um se lit [œ̃] dans parfum, [ɔm] dans album." }),
  etape(4, "p4-ien", "en = [ɛ̃] : chien", "[ɛ̃]", "Voyelles nasales 2", { "en-in": "en = [ɛ̃] (chien)" }, { noyau: ["ien"], liste: ["ien", "éen", "léen", "réen"] },
    { note: "Après i ou é, en se lit [ɛ̃] : bien, chien, européen." }),
  etape(4, "p4-tion", "t = [s] : -tion", "[s]", "Consonnes fricatives 6", { "t-s": "t = [s] (-tion)" },
    { liste: ["tion", "ation", "ition", "otion", "ution", "nation", "lotion", "potion", "mation", "ration"] }, { note: "t suivi de ion se lit [s] : récréation, opération." }),
  etape(4, "p4-y-yod", "y = [j] ; ay, oy, uy", "[j]", "Semi-consonnes 3 : y pour le yod", { "y-yod": "y = [j]", ay: "ay, oy, uy" },
    { liste: ["ya", "yo", "you", "yé", "yeu", "ayon", "oya", "uyau", "eyé", "ayé", "oyé", "ayeu", "uya"] },
    { note: "yoga ; entre deux voyelles, y vaut deux i : crayon (crai-ion), noyer (noi-ié)." }),
  etape(4, "p4-il", "il : ail, eil, euil", "[j]", "Semi-consonnes 3 : il pour le yod", { il: "il final (ail, soleil)" },
    { liste: ["ail", "eil", "euil", "ouil", "tail", "rail", "vail", "mail", "leil", "meil", "teil", "reil", "feuil", "deuil", "teuil", "nouil"] },
    { note: "travail, soleil, fauteuil." }),
  revisions(4),

  // ── CP, période 5 ──
  etape(5, "p5-doubles", "bb, dd, ff, pp, rr, tt, cc, gg", "", "Cas particuliers 5 : les consonnes doubles", { "cons-double": "consonne double", cc: "cc", gg: "gg" },
    { liste: ["abba", "adda", "affi", "appo", "arru", "atto", "acca", "ottou", "ippa", "uffo"] },
    { note: "Deux lettres pour un son : carotte, chiffre ; cc se lit [k] (accord) ou [ks] (accent)." }),
  etape(5, "p5-mm-nn", "mm, emm, nn, enn", "", "Cas particuliers 5 : les consonnes doubles", { mm: "mm", emm: "emm", nn: "nn", enn: "enn" },
    { liste: ["omma", "ommé", "anna", "onné", "emmé", "enna", "ommo", "anné"] }, { note: "pomme, bonnet ; emm et enn : emmener, ennui — et femme." }),
  etape(5, "p5-ll", "ll ; ill = [il]", "[l]", "Cas particuliers 5 : ll", { ll: "ll" }, { liste: ["alla", "ollé", "ulla", "allou", "mille", "ville"] },
    { note: "allée ; ill se lit [il] après une consonne dans mille, ville." }),
  etape(5, "p5-ill", "ill = [j]", "[j]", "Semi-consonne 4 : ill", { "ill-yod": "ill = [j]" },
    { liste: ["aill", "eill", "ouill", "euill", "ille", "paill", "raill", "taill", "meill", "veill", "bouill", "touill", "nouill", "fouill", "bille", "fille"] },
    { note: "abeille, fille, grenouille, paille." }),
  etape(5, "p5-accents", "où, ô, î, û, ï", "", "Voyelles orales 8 : les accents", { où: "où", ô: "ô", î: "î", û: "û", ï: "ï" },
    { liste: ["où", "ô", "lô", "rô", "pô", "tô", "cô", "mô", "dô", "dî", "lî", "gî", "mû", "sû", "flû", "aï", "naï"] }),
  etape(5, "p5-w", "ou = [w], w", "[w] [v]", "Semi-consonne 5 : [w]", { "ou-w": "ou = [w]", w: "w" },
    { liste: ["oua", "oui", "ouè", "oué", "wa", "wi", "wo", "wé"] },
    // ou devant une voyelle qu'on entend : alouette, jouet — pas joue, ni grenouille.
    { porte: (ms, mot) => ms.some((m) => m.cle === "w" || m.cle === "ou-w") || /ou(?!e$|es$|ent$|ill|il$)[aeèéêi]/.test(mot),
      note: "alouette, oui ; kiwi, et wagon où w se lit [v]." }),
  etape(5, "p5-finales", "finales prononcées : mer, bec, sel", "", "Cas particuliers 5 : les finales prononcées", { "e-finale": "e + consonne finale (bec)", finale: "finale prononcée" },
    { liste: ["bec", "sel", "nef", "chef", "cep", "vel", "mer", "fer", "net", "tec", "ral"] }, { note: "mer, net, bec, sel : cette fois, la consonne finale s'entend." }),
  etape(5, "p5-muettes", "lettres muettes : b, c, f, g, l, p", "", "Lettres muettes 3", { "muette-3": "lettre muette (loup, long)" }, { liste: [] },
    { note: "plomb, tabac, clef, long, outil, loup — et le p de compte." }),
  etape(5, "p5-rares", "graphies rares", "", "Correspondances rares dans des mots fréquents", { rare: "graphie rare", "ch-k": "ch = [k]" }, { liste: [] },
    { note: "monsieur, femme, second, oignon, dix, écho : on les apprend une à une." }),
  revisions(5),

  // ── CE1 : consolider les graphèmes complexes ──
  etape("ce1", "ce1-an-in-en", "an, am, in, im, en, em", "[ɑ̃] [ɛ̃]", "Graphèmes complexes", { an: "an", am: "am", in: "in", im: "im", en: "en", em: "em" },
    { noyau: ["an", "in", "en"] }, { note: "an, in, en s'écrivent am, im, em devant m, p, b. Suivis d'une voyelle, ils retrouvent leur valeur : animal, timide." }),
  etape("ce1", "ce1-ain-ein", "ain, ein, yn, ym", "[ɛ̃]", "Graphèmes complexes", { ain: "ain", ein: "ein", yn: "yn", ym: "ym" },
    { noyau: ["ain", "ein"], liste: ["syn", "lyn", "tyn", "sym"] }, { note: "yn s'écrit ym devant p ou b. Suivis d'une voyelle, ils retrouvent leur valeur : saine, veine." }),
  etape("ce1", "ce1-eu", "eu, eur", "[ø] [œ]", "Graphèmes complexes", { eu: "eu" }, { noyau: ["eu", "eur"] }),
  etape("ce1", "ce1-j-g", "j, g = [ʒ]", "[ʒ]", "Graphèmes complexes", { j: "j", "g-j": "g = [ʒ]", ge: "ge" },
    { attaque: ["j", { g: "g", devant: "faibles" }, { g: "ge", devant: "fortes" }] }, { note: "g se lit [ʒ] devant e, é, è, ê, i, y." }),
  etape("ce1", "ce1-g-gu-gn", "g, gu, gn", "[g] [ɲ]", "Graphèmes complexes", { g: "g = [g]", gu: "gu", gn: "gn" },
    { attaque: [{ g: "g", devant: "fortes" }, { g: "gu", devant: "faibles" }, "gn"] }, { note: "g se lit [g] devant a, o, ou, u ; gu devant e, é, è, ê, i, y." }),
  etape("ce1", "ce1-k-qu", "k, qu, ch = [k]", "[k]", "Graphèmes complexes", { k: "k", qu: "qu", q: "q", "ch-k": "ch = [k]" },
    { attaque: ["k", "qu"], liste: ["chro", "chri", "chlo"] }, { note: "qu se lit [k] ; ch aussi dans quelques mots : chorale, écho." }),
  etape("ce1", "ce1-c-ç", "c, ç", "[k] [s]", "Graphèmes complexes", { "c-k": "c = [k]", "c-s": "c = [s]", ç: "ç" },
    { attaque: ["c", { g: "ç", devant: "fortes" }] }, { note: "c se lit [k] devant a, o, u ; [s] devant e, é, è, ê, i, y ; ç se lit toujours [s]." }),
  etape("ce1", "ce1-oi-y", "oi, y = [ii]", "[wa] [j]", "Graphèmes complexes", { oi: "oi", ay: "ay, oy, uy" },
    { noyau: ["oi"], liste: ["aya", "ayo", "oya", "oyé", "uya", "uyé", "eyé"] }, { note: "Entre deux voyelles, y vaut deux i : rayon (rai-ion), joyeux (joi-ieu)." }),
  etape("ce1", "ce1-ien", "ien, oin, ion", "[jɛ̃] [wɛ̃] [jɔ̃]", "Graphèmes complexes", { "en-in": "en = [ɛ̃] (chien)", oin: "oin" },
    { noyau: ["ien", "oin", "ion"] },
    { porte: (ms, mot) => ms.some((m) => m.cle === "en-in" || m.cle === "oin") || (/ion/.test(mot) && ms.some((m) => m.cle === "i-yod")) }),
  etape("ce1", "ce1-er-ez-et", "er, ez, et", "[e] [ɛ]", "Graphèmes complexes", { "er-final": "er final", ez: "ez", "et-final": "et final" },
    { liste: ["chez", "nez", "tez", "sez", "lez", "quet", "chet", "jet", "net", "let", "ret", "pet"] },
    { fins: ["-er", "-ez", "-et"], note: "En fin de mot, er et ez se lisent [e] ; et se lit [ɛ]." }),
  etape("ce1", "ce1-x-ph", "x, ph", "[ks] [gz] [f]", "Graphèmes complexes", { "x-ks": "x = [ks]", "x-gz": "x = [gz]", ph: "ph" },
    { attaque: ["x", "ph"], liste: ["exa", "exi", "exo", "axo", "oxa"] }, { note: "x se lit le plus souvent [ks], [gz] après ex devant une voyelle ; ph se lit [f]." }),
  etape("ce1", "ce1-e-cons", "ec, ef, el, es, er, ep", "[ɛ]", "Graphèmes complexes", { "e-cc": "e devant deux consonnes", "e-finale": "e + consonne finale (bec)" },
    { liste: ["bec", "pel", "tef", "ver", "mep", "sel", "nec", "ter", "bel", "perto", "vesta", "becli", "merlo"] },
    { note: "e se lit [ɛ] devant une consonne finale (bec) ou devant deux consonnes (veste)." }),
  etape("ce1", "ce1-e-double", "ell, emm, ett, err, eff, enn, ess", "[ɛ]", "Graphèmes complexes", { "e-double": "e devant ll, ss, rr, tt", emm: "emm", enn: "enn" },
    { liste: ["ella", "esso", "erri", "ettou", "effa", "emmo", "enni", "elli", "essou", "erra"] },
    { note: "Devant une consonne double, e se lit le plus souvent [ɛ] ; parfois [e] (dessert) ou [ə] (dessus)." }),
  etape("ce1", "ce1-l", "pl, fl, bl, cl, gl", "", "Graphèmes complexes : les groupes de consonnes", {},
    { attaque: ["pl", "fl", "bl", "cl", "gl"] }, { porte: (_ms, mot) => /[pfbcgv]l/.test(mot) }),
  etape("ce1", "ce1-r", "br, pr, cr, gr, fr, vr, tr, dr", "", "Graphèmes complexes : les groupes de consonnes", {},
    { attaque: ["br", "pr", "cr", "gr", "fr", "vr", "tr", "dr"] }, { porte: (_ms, mot) => /[bpcgfvtd]r/.test(mot) }),
  etape("ce1", "ce1-eil-ail", "eil, ail, euil", "[j]", "Graphèmes complexes", { il: "il final (ail, soleil)" }, { noyau: ["ail", "eil", "euil"] }),
  etape("ce1", "ce1-aill-eill", "aill, eill, ouill", "[j]", "Graphèmes complexes", { "ill-yod": "ill = [j]" }, { noyau: ["aill", "eill", "ouill"] },
    { porte: (ms, mot) => ms.some((m) => m.cle === "ill-yod") && /(a|e|ou|eu)ill/.test(mot) }),
];

const PAR_ID = new Map(ETAPES.map((e, i) => [e.id, { e, i }]));

/** Les anciens réglages nommaient un son (« ch ») : on le retrouve dans la progression. */
const ANCIENS_SONS: Record<string, string> = {
  a: "p1-voyelles", i: "p1-voyelles", o: "p1-voyelles", u: "p1-voyelles", é: "p1-voyelles", e: "p1-e", è: "p3-e-accents",
  l: "p1-l", r: "p1-r", f: "p1-f", j: "p1-j", m: "p2-m", n: "p2-n", s: "p2-s", ch: "p2-ch", p: "p2-p", t: "p2-t", v: "p2-v",
  b: "p2-b", d: "p2-d", z: "p2-z", gn: "p2-gn", k: "p3-c-k", g: "p3-g-gu", ou: "p1-ou", eu: "p1-eu", on: "p3-on", an: "p3-an", in: "p3-in", oi: "p3-oi",
};
export const ETAPE_PAR_DEFAUT = "p2-ch";
export const etapeDe = (id: string): EtapeCgp => (PAR_ID.get(id) ?? PAR_ID.get(ANCIENS_SONS[id] ?? ETAPE_PAR_DEFAUT)!).e;
export const etapeVoisine = (e: EtapeCgp, pas: 1 | -1): EtapeCgp | undefined => ETAPES[PAR_ID.get(e.id)!.i + pas];

/** Ce qu'on a vu jusqu'à cette étape, elle comprise. */
export function vuesJusqua(e: EtapeCgp): Set<string> {
  const vues = new Set<string>();
  for (const x of ETAPES.slice(0, PAR_ID.get(e.id)!.i + 1)) for (const c of Object.keys(x.cles)) vues.add(c);
  return vues;
}

/** Le nom court et l'étape de chaque correspondance — là où elle s'apprend la première fois. */
const OU_SAPPREND = new Map<string, { libelle: string; etape: EtapeCgp }>();
for (const e of ETAPES) for (const [cle, libelle] of Object.entries(e.cles)) if (!OU_SAPPREND.has(cle)) OU_SAPPREND.set(cle, { libelle, etape: e });
export const ouSApprend = (cle: string) => OU_SAPPREND.get(cle);

/** Un mot se déchiffre quand toutes ses correspondances, et ses structures de syllabes, ont été vues. */
export function dechiffrable(ms: Morceau[], vues: ReadonlySet<string>): boolean {
  if (!ms.length || ms.some((m) => !vues.has(m.cle))) return false;
  const s = structure(ms);
  return s === 0 || vues.has(s === 1 ? "structure-vc" : "structure-cvc");
}

/** Ce qui manque pour lire un mot : chaque correspondance pas encore vue, et l'étape où elle s'apprend. */
export function lacunes(ms: Morceau[], vues: ReadonlySet<string>): { cle: string; libelle: string; etape?: EtapeCgp }[] {
  const manque = [...new Set(ms.map((m) => m.cle))].filter((c) => !vues.has(c));
  const s = structure(ms);
  if (s === 2 && !vues.has("structure-cvc")) manque.push("structure-cvc");
  else if (s === 1 && !vues.has("structure-vc")) manque.push("structure-vc");
  // Dans l'ordre de la progression : ce qui vient d'abord, puis ce qui vient plus tard.
  const rangDe = (cle: string) => PAR_ID.get(OU_SAPPREND.get(cle)?.etape.id ?? "")?.i ?? ETAPES.length;
  return manque.sort((a, b) => rangDe(a) - rangDe(b))
    .map((cle) => ({ cle, libelle: OU_SAPPREND.get(cle)?.libelle ?? cle, etape: OU_SAPPREND.get(cle)?.etape }));
}

const CLES_DE_LA_PERIODE = new Map<Periode, Set<string>>();
for (const e of ETAPES) {
  const cles = CLES_DE_LA_PERIODE.get(e.periode) ?? new Set<string>();
  for (const c of Object.keys(e.cles)) cles.add(c);
  CLES_DE_LA_PERIODE.set(e.periode, cles);
}

/** Le mot porte-t-il ce que l'étape fait travailler ? */
export function porteLEtape(e: EtapeCgp, ms: Morceau[], mot: string): boolean {
  if (e.porte) return e.porte(ms, mot);
  const cles = e.revision ? CLES_DE_LA_PERIODE.get(e.periode)! : new Set(Object.keys(e.cles));
  return ms.some((m) => cles.has(m.cle));
}

// ── Les syllabes ──────────────────────────────────────────────────────────

/** Les voyelles qu'on marie à une consonne, dans l'ordre du guide : a, o, é, u, i, e, eu, ou — puis les autres. */
const VOYELLES_A_MARIER = ["a", "o", "é", "u", "i", "e", "eu", "ou", "on", "an", "in", "oi", "au", "è", "ai", "un"];
/** Les consonnes qu'on place devant un noyau ; devant e, i : qu et gu pour garder [k] et [g]. */
const CONSONNES_A_MARIER: { g: string; devantEI?: string }[] = [
  { g: "l" }, { g: "r" }, { g: "f" }, { g: "j" }, { g: "v" }, { g: "ch" }, { g: "p" }, { g: "t" }, { g: "b" }, { g: "d" },
  { g: "m" }, { g: "n" }, { g: "z" }, { g: "s" }, { g: "c", devantEI: "qu" }, { g: "g", devantEI: "gu" },
];
const faible = (lettre: string) => "eéèêiîy".includes(lettre);
/** Les noyaux devant lesquels c et g s'écrivent qu et gu pour garder [k] et [g]. */
const AVEC_QU = new Set(["e", "é", "è", "ê", "i", "in", "eu", "eur"]);

function syllabesDuGabarit(gab: Gabarit, vues: ReadonlySet<string>): string[] {
  const sortie: string[] = [];
  for (const att of gab.attaque ?? []) {
    const { g, devant } = typeof att === "string" ? { g: att, devant: undefined } : att;
    for (const v of VOYELLES_A_MARIER) {
      if ((devant === "fortes" && faible(v[0])) || (devant === "faibles" && !faible(v[0]))) continue;
      if (/u$/.test(g) && /^(u|ou)/.test(v)) continue; // quu, guou
      sortie.push(g + v);
    }
  }
  for (const n of gab.noyau ?? []) {
    for (const c of CONSONNES_A_MARIER) {
      // gui, cy : la consonne changerait de voix.
      if (c.devantEI && (n[0] === "y" || /^u[aeiouy]/.test(n))) continue;
      // que, qui, quin, gueu gardent [k] et [g] ; cen, gien, cein se lisent [s] et [ʒ], comme dans cent, magicien.
      sortie.push((AVEC_QU.has(n) && c.devantEI ? c.devantEI : c.g) + n);
    }
  }
  sortie.push(...(gab.liste ?? []));
  return [...new Set(sortie)].filter((s) => dechiffrable(decouper(s, { syllabe: true }), vues));
}

/** Les syllabes de l'étape — toutes celles de la période, pour les révisions. */
export function syllabesDe(e: EtapeCgp): string[] {
  const vues = vuesJusqua(e);
  if (!e.revision) return syllabesDuGabarit(e.syllabes, vues);
  return [...new Set(ETAPES.filter((x) => x.periode === e.periode && !x.revision).flatMap((x) => syllabesDuGabarit(x.syllabes, vues)))];
}

// ── Les pseudo-mots ───────────────────────────────────────────────────────

const VOYELLE = /[aàâeéèêëiîïoôuûyœ]/;

/** Deux morceaux bout à bout, avec l'orthographe : m devant p, b ; pas de rencontre de voyelles qui ferait un autre son. */
function coller(a: string, b: string): string | null {
  if (VOYELLE.test(a.slice(-1)) && VOYELLE.test(b[0])) return null;
  if (/ill$/.test(a)) return null; // paill-mai : ill ne s'écrit pas devant une consonne
  if (/[nm]$/.test(a) && /^[nm]/.test(b)) return null;
  if (/n$/.test(a) && /^[pb]/.test(b)) return /(ai|ei|oi|ie|y|u)n$/.test(a) ? null : a.slice(0, -1) + "m" + b;
  return a + b;
}

/**
 * Des mots inventés, faits d'une syllabe de l'étape et de syllabes simples
 * déjà vues : on ne peut les lire qu'en déchiffrant — c'est tout leur intérêt.
 */
export function pseudoMotsDe(e: EtapeCgp, combien: number, alea: () => number, reels: ReadonlySet<string>): string[] {
  const vues = vuesJusqua(e);
  const miennes = syllabesDe(e);
  const simples = syllabesDuGabarit({ attaque: ["l", "r", "f", "j", "v", "ch", "p", "t", "b", "d", "m", "n", "z"] }, vues).filter((s) => !/e$/.test(s));
  const consonnes = ["l", "r", "f", "v", "ch", "p", "t", "b", "d", "m", "n"].filter((c) => vues.has(c));
  if (!simples.length || (!miennes.length && !e.fins)) return [];
  const pris = <T,>(l: readonly T[]) => l[Math.floor(alea() * l.length)];
  const sortie = new Set<string>();
  for (let essai = 0; sortie.size < combien && essai < combien * 40; essai++) {
    const n = alea() < 0.7 ? 2 : 3;
    const morceaux = Array.from({ length: n }, () => pris(simples));
    // Avec une fin (lumer, lirat), c'est elle qui porte l'étape ; sinon, une syllabe de l'étape prend une place.
    if (miennes.length && !e.fins) morceaux[Math.floor(alea() * n)] = pris(miennes);
    let mot: string | null = morceaux[0];
    for (const m of morceaux.slice(1)) mot = mot && coller(mot, m);
    if (mot && /ill$/.test(mot)) mot += "e";
    if (mot && e.fins) {
      const fin = pris(e.fins);
      mot = fin.startsWith("-") ? (consonnes.length ? coller(mot, pris(consonnes) + fin.slice(1)) : null) : mot + fin;
    }
    if (!mot || mot.length > 9 || reels.has(mot)) continue;
    const ms = decouper(mot);
    if (dechiffrable(ms, vues) && porteLEtape(e, ms, mot)) sortie.add(mot);
  }
  return [...sortie];
}

// ── Les mots ──────────────────────────────────────────────────────────────

const DECOUPES = new Map<string, Morceau[]>();
const decoupe = (mot: string) => {
  let ms = DECOUPES.get(mot);
  if (!ms) DECOUPES.set(mot, (ms = decouper(mot)));
  return ms;
};

export interface MotEnAttente {
  mot: string;
  manque: ReturnType<typeof lacunes>;
  /** L'étape où le mot se lira : celle de ce qui manque en dernier ; aucune s'il demande ce que le CP n'enseigne pas. */
  aPartirDe?: EtapeCgp;
}

/**
 * Les mots de l'étape : ceux de l'enseignant d'abord, puis ceux du corpus,
 * tous déchiffrables. Les mots de l'enseignant qui portent le graphème mais
 * demandent ce qu'on n'a pas encore vu attendent, avec la raison.
 */
export function motsDe(e: EtapeCgp, mesMots: readonly string[]): { miens: string[]; corpus: string[]; enAttente: MotEnAttente[] } {
  const vues = vuesJusqua(e);
  const miens: string[] = [];
  const enAttente: MotEnAttente[] = [];
  for (const mot of mesMots) {
    const ms = decouper(mot);
    if (!porteLEtape(e, ms, mot)) continue;
    if (dechiffrable(ms, vues)) miens.push(mot);
    else {
      const manque = lacunes(ms, vues);
      enAttente.push({ mot, manque, aPartirDe: manque.some((m) => !m.etape) ? undefined : manque[manque.length - 1].etape });
    }
  }
  const corpus = MOTS_DECHIFFRABLES.filter((mot) => !miens.includes(mot) && porteLEtape(e, decoupe(mot), mot) && dechiffrable(decoupe(mot), vues));
  return { miens, corpus, enAttente };
}

/** « Déjà vu » : les périodes entières, puis les étapes de la période en cours. */
export function dejaVu(e: EtapeCgp): string {
  if (e.periode === "ce1") return "tout le code du CP : on consolide les graphèmes complexes.";
  const avant = PERIODES.filter((p) => typeof p.id === "number" && p.id < (e.periode as number));
  const ici = ETAPES.filter((x) => x.periode === e.periode && !x.revision && PAR_ID.get(x.id)!.i < PAR_ID.get(e.id)!.i).map((x) => x.titre.split(" : ")[0]);
  const periodes = ["", "la période 1", "les périodes 1 et 2"][avant.length] ?? `les périodes 1 à ${avant.length}`;
  if (e.revision) return `${periodes ? `${periodes}, et ` : ""}toute la période ${e.periode}.`;
  if (!periodes && !ici.length) return "rien encore : c'est le tout début.";
  return [periodes, ici.length ? `en période ${e.periode} : ${ici.join(" · ")}` : ""].filter(Boolean).join(" ; ") + ".";
}
