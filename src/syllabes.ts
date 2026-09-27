// Les syllabes d'un mot, telles qu'on les scande en classe.
//
// Le guide « Pour préparer l'apprentissage de la lecture et de l'écriture à
// l'école maternelle » travaille sur les syllabes orales : « la segmentation
// des mots en syllabes se réalise à partir des syllabes orales ». « Table »
// se scande donc en une syllabe, « crocodile » en trois. On ne prétend pas
// au dictionnaire : c'est une segmentation raisonnable, que l'enseignant
// voit et corrige d'un clic avant d'imprimer.

const VOYELLES = "aeiouyàâäéèêëîïôöùûüœ";
/** Voyelle accentuée après une autre voyelle : un hiatus (a-é-roport, ma-ïs). */
const HIATUS = "éèêëïî";
/** Deux consonnes qu'on ne sépare pas : elles ouvrent la syllabe suivante. */
const CLUSTERS = new Set([
  "bl", "cl", "fl", "gl", "pl", "vl", "br", "cr", "dr", "fr", "gr", "pr", "tr", "vr",
  "ch", "ph", "th", "gn", "sh", "qu",
]);

/** Le mot tel qu'on le découpe : en minuscules, sans apostrophe ni espace de trop. */
export const normaliserMot = (mot: string) =>
  (mot ?? "").toLowerCase().trim().replace(/['’]/g, "").replace(/\s+/g, " ");

const estVoyelle = (m: string, i: number) => {
  const c = m[i];
  if (!VOYELLES.includes(c)) return false;
  // Le « u » de « qu » et de « gu » devant e, i ne se prononce pas : bar-que, gui-tare.
  if (c === "u" && i > 0 && (m[i - 1] === "q" || (m[i - 1] === "g" && "eiéèêy".includes(m[i + 1] ?? "")))) return false;
  // Un « y » collé à une voyelle joue la consonne : cra-yon, yaourt.
  if (c === "y") {
    const avant = i > 0 && VOYELLES.includes(m[i - 1]) && m[i - 1] !== "y";
    const apres = i < m.length - 1 && VOYELLES.includes(m[i + 1]) && m[i + 1] !== "y";
    return !(avant || apres);
  }
  return true;
};

/**
 * Les syllabes d'un mot, orales par défaut (le « e » muet final rejoint la
 * syllabe qui précède), écrites si on le demande (ta-ble).
 */
export function decouperSyllabes(mot: string, options: { ecrites?: boolean } = {}): string[] {
  const m = normaliserMot(mot).replace(/[^a-zàâäéèêëîïôöùûüœç \-]/g, "");
  if (!m) return [];
  if (/[ -]/.test(m)) return m.split(/[ -]+/).filter(Boolean).flatMap((p) => decouperSyllabes(p, options));

  // 1. Les noyaux vocaliques : des suites de voyelles, coupées à un hiatus.
  const noyaux: [number, number][] = []; // [début, fin[ dans m
  let i = 0;
  while (i < m.length) {
    if (!estVoyelle(m, i)) { i++; continue; }
    let j = i + 1;
    while (j < m.length && estVoyelle(m, j) && !HIATUS.includes(m[j])) j++;
    noyaux.push([i, j]);
    i = j;
  }
  if (noyaux.length === 0) return [m];

  // 2. Les consonnes entre deux noyaux se partagent.
  const coupes: number[] = [0];
  for (let k = 1; k < noyaux.length; k++) {
    const debut = noyaux[k - 1][1];
    const fin = noyaux[k][0];
    const cons = m.slice(debut, fin);
    let coupe: number;
    if (cons.length <= 1) coupe = debut;
    else if (cons.length === 2) coupe = (cons[0] === cons[1] || CLUSTERS.has(cons)) ? debut : debut + 1;
    else coupe = CLUSTERS.has(cons.slice(-2)) ? fin - 2 : fin - 1;
    coupes.push(coupe);
  }
  coupes.push(m.length);
  const syllabes: string[] = [];
  for (let k = 0; k + 1 < coupes.length; k++) syllabes.push(m.slice(coupes[k], coupes[k + 1]));

  // 3. Le « e » muet final (pomme, pommes, barque) ne se scande pas à l'oral.
  if (!options.ecrites && syllabes.length > 1) {
    const dernier = syllabes[syllabes.length - 1];
    // Ce qui précède le e final : des consonnes seulement ? « qu » et « gu » en sont (bar-que, ba-gue).
    const corps = dernier.replace(/es?$/, "").replace(/qu/g, "k").replace(/gu$/, "g");
    if (/es?$/.test(dernier) && !/[aeiouyàâäéèêëîïôöùûüœ]/.test(corps)) {
      syllabes.pop();
      syllabes[syllabes.length - 1] += dernier;
    }
  }
  return syllabes;
}

export const compterSyllabes = (mot: string, options: { ecrites?: boolean } = {}) =>
  decouperSyllabes(mot, options).length;

/**
 * Ce qu'on entend dans une syllabe, grossièrement : « eau » et « au » sonnent
 * « o », « ai » sonne « è », « c » devant « e » sonne « s ». Deux syllabes de
 * même clé riment, ou attaquent pareil — « ba » de bateau, banane, ballon.
 */
export function cleSon(syllabe: string): string {
  let s = normaliserMot(syllabe);
  const V = "aeiouyàâäéèêëîïôöùûüœAIOU";
  s = s.replace(/qu/g, "k").replace(/ph/g, "f").replace(/th/g, "t").replace(/sh/g, "ch").replace(/ç/g, "s");
  s = s.replace(/gu(?=[eiéèêy])/g, "g").replace(/g(?=[eiéèêy])/g, "j");
  s = s.replace(/c(?=[eiéèêy])/g, "s").replace(/(?<!c)c(?!h)/g, "k");
  s = s.replace(/x/g, "ks").replace(/h(?!$)/g, "").replace(/ch/g, "C");
  // Les nasales d'abord, tant que la voyelle qui suit dit encore si le n sonne : « nane » n'est pas « nan ».
  s = s.replace(new RegExp(`(ain|ein|aim|eim|in|un|im|yn)(?![${V}])`, "g"), "I")
    .replace(new RegExp(`(an|en|am|em)(?![${V}])`, "g"), "A")
    .replace(new RegExp(`(on|om)(?![${V}])`, "g"), "O");
  // Le e muet final ne compte pas, s'il reste une voyelle avant.
  if (new RegExp(`[${V}].*[^${V}]es?$`).test(s)) s = s.replace(/es?$/, "");
  s = s.replace(/eau|au/g, "o").replace(/ai|ei|è|ê|ë|é/g, "e").replace(/oi/g, "wa").replace(/ou/g, "U");
  s = s.replace(/[àâä]/g, "a").replace(/[îï]/g, "i").replace(/[ôö]/g, "o").replace(/[ùûü]/g, "u").replace(/y/g, "i").replace(/œ/g, "e");
  s = s.replace(/(.)\1+/g, "$1");
  return s;
}

/** La syllabe d'attaque, telle qu'elle sonne. */
export const attaque = (mot: string) => cleSon(decouperSyllabes(mot)[0] ?? "");

/**
 * La rime : la dernière syllabe, telle qu'elle sonne — un « s » seul entre
 * deux voyelles y sonne « z » (bi-sou, mai-son), ce que la syllabe seule ne
 * sait pas.
 */
export function rime(mot: string): string {
  const syl = decouperSyllabes(mot);
  let derniere = syl[syl.length - 1] ?? "";
  const avant = syl[syl.length - 2];
  if (avant && /^s[^s]/.test(derniere) && /[aeiouyàâäéèêëîïôöùûüœ]$/.test(avant)) derniere = `z${derniere.slice(1)}`;
  return cleSon(derniere);
}
