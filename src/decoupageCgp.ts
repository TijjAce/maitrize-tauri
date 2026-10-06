// Découper un mot en graphèmes, pour savoir s'il se déchiffre.
//
// Une grille de fluence ne donne à lire que ce que la classe a appris : des
// syllabes, des mots et des pseudo-mots faits des seules correspondances déjà
// étudiées (guide « Pour enseigner la lecture et l'écriture au CP », 2018,
// p. 67-74 ; guide CE1, 2019, p. 12-16). Chaque morceau d'un mot porte la clé
// de la correspondance qu'il demande — « ch », « c = [s] », « e muet » — et un
// mot se déchiffre quand toutes ses clés ont été vues.
//
// Le découpage suit les règles qu'on enseigne : c et g devant e, i, y ; s
// entre deux voyelles ; m devant m, p, b ; les lettres muettes en fin de mot.
// Une courte liste de mots y échappe (femme, monsieur, second). Ce n'est pas
// de la phonétique savante : il dit ce qu'un élève doit connaître pour lire le
// mot, et c'est ce qu'il faut à une grille.

/** Voyelle, consonne, ou lettre muette — pour les structures de syllabes. */
export type Role = "V" | "C" | "0";

export interface Morceau {
  /** Les lettres : « ch », « eau ». */
  g: string;
  /** La correspondance qu'elles demandent d'avoir apprise. */
  cle: string;
  role: Role;
}

const VOYELLES = "aàâäeéèêëiîïoôöuùûüyœ";
const estVoyelle = (c?: string) => !!c && VOYELLES.includes(c);
const estConsonne = (c?: string) => !!c && /[a-zç]/.test(c) && !estVoyelle(c);
/** Devant ces lettres, c se lit [s] et g se lit [ʒ]. */
const faible = (c?: string) => !!c && "eéèêëiîïy".includes(c);
/** Deux consonnes qui ouvrent ensemble une syllabe — fl-eur, tr-ain — ou qui n'en font qu'une. */
const GROUPES = new Set(["bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "tr", "vr", "ch", "ph", "th", "gn", "qu", "gu"]);

// ── Les mots qui échappent aux règles ─────────────────────────────────────

/** er final prononcé [ɛʁ] (guide CP, période 5) — les autres se lisent [e]. */
const ER_PRONONCE = new Set(["mer", "fer", "ver", "vers", "hiver", "cher", "fier", "amer", "hier", "enfer", "super", "laser", "cancer",
  "revolver", "hamster", "poster", "cuiller", "envers", "travers", "univers", "divers", "revers", "pervers", "tiers"]);
const ET_PRONONCE = new Set(["net", "set", "basket", "rocket"]);
const S_PRONONCE = new Set(["os", "ours", "bus", "autobus", "tennis", "maïs", "as", "hélas", "oasis", "cactus", "virus", "atlas", "mars",
  "vis", "jadis", "iris", "bis", "cassis", "anis", "lotus", "rébus", "terminus", "papyrus", "eucalyptus", "hibiscus", "campus", "bonus",
  "sinus", "humus", "sens", "ananas", "albatros", "rhinocéros", "lapis", "express"]);
const T_PRONONCE = new Set(["but", "brut", "huit", "chut", "zut", "dot", "mat", "scout", "yaourt", "rapt", "test", "kit", "volt", "foot",
  "sprint", "transat", "rut", "fat", "kart"]);
const D_PRONONCE = new Set(["sud", "bled", "raid", "caïd", "stand"]);
const C_MUET = new Set(["tabac", "estomac", "porc", "caoutchouc", "croc", "accroc", "escroc", "raccroc"]);
const P_PRONONCE = new Set(["cap", "stop", "top", "hop", "slip", "ketchup", "handicap", "jeep", "clip", "scalp", "cep", "flop"]);
const F_MUET = new Set(["nerf", "cerf"]);
const L_MUET = new Set(["outil", "outils", "gentil", "gentils", "fusil", "fusils", "sourcil", "sourcils", "persil", "nombril"]);
const B_PRONONCE = new Set(["club", "snob", "kebab", "baobab", "pub", "job"]);
const X_KS = new Set(["lynx", "index", "thorax", "larynx", "sphinx", "silex", "inox", "relax", "fax", "box", "latex", "codex", "phénix", "onyx"]);
const Z_PRONONCE = new Set(["gaz", "quiz", "fez", "jazz"]);
/** ill se lit [il] après une consonne dans ces mots : mille, ville (guide CP, période 5). */
const ILL_L = new Set(["mille", "milles", "ville", "villes", "village", "villages", "villa", "villageois", "tranquille", "tranquillement",
  "million", "millions", "milliard", "millier", "millimètre", "millénaire", "pupille", "oscille", "distiller", "bacille"]);
/** ch se lit [k] : chorale, écho (guide CP, période 5 ; guide CE1). */
const CH_K = new Set(["chorale", "écho", "échos", "orchestre", "chœur", "choléra", "technique", "orchidée", "psychologue",
  "archéologue", "chaos", "archange", "varech", "krach"]);
/** en se lit [ɛ̃] : examen. */
const EN_IN = new Set(["examen", "abdomen", "spécimen", "pollen", "lichen", "agenda", "pentagone", "rhododendron"]);
/** ien se lit [jɑ̃] : client, patient — et science, où le c suit. */
const IEN_AN = new Set(["client", "cliente", "clients", "patient", "patiente", "patients", "orient", "ingrédient", "ingrédients",
  "quotient", "impatient", "impatiente", "inconvénient"]);

/** Les mots qu'aucune règle d'école ne lit : leurs clés, données une à une. */
const EXCEPTIONS: Record<string, string[]> = {
  femme: ["f", "emm", "e-muet"], femmes: ["f", "emm", "e-muet", "s-muet"],
  monsieur: ["m", "rare", "s", "i-yod", "eu", "muette-3"],
  second: ["s", "e", "rare", "on", "d-muet"], seconde: ["s", "e", "rare", "on", "d", "e-muet"],
  oignon: ["rare", "gn", "on"], oignons: ["rare", "gn", "on", "s-muet"],
  faisan: ["f", "rare", "s-z", "an"], paysan: ["p", "rare", "s-z", "an"], pays: ["p", "rare", "s-muet"],
  dix: ["d", "i", "rare"], six: ["s", "i", "rare"],
  deuxième: ["d", "eu", "rare", "i-yod", "è", "m", "e-muet"], sixième: ["s", "i", "rare", "i-yod", "è", "m", "e-muet"],
  dixième: ["d", "i", "rare", "i-yod", "è", "m", "e-muet"],
  fils: ["f", "i", "muette-3", "finale"],
  sept: ["s", "e-cc", "muette-3", "finale"],
  août: ["rare", "finale"],
  est: ["es", "t-muet"],
  et: ["et-final"],
  eu: ["eu-u"], eue: ["eu-u", "e-muet"],
  oui: ["ou-w", "i"],
  ouest: ["ou-w", "e-cc", "s-ss", "finale"],
  œil: ["œi", "il"],
  yeux: ["y-yod", "eu", "x-muet"],
  dessus: ["d", "e", "ss", "u", "s-muet"], dessous: ["d", "e", "ss", "ou", "s-muet"],
  doigt: ["d", "oi", "muette-3", "t-muet"], doigts: ["d", "oi", "muette-3", "t-muet", "s-muet"],
  vingt: ["v", "in", "muette-3", "t-muet"],
  automne: ["au", "t", "o", "muette-3", "n", "e-muet"],
  zoo: ["z", "rare"], clef: ["c-k", "l", "é", "muette-3"],
  short: ["rare", "o", "r", "finale"], schéma: ["rare", "é", "m", "a"],
  faon: ["f", "rare"], paon: ["p", "rare"], taon: ["t", "rare"],
  accueil: ["a", "cc", "rare", "il"], cueillir: ["c-k", "rare", "ill-yod", "i", "r"],
  aquarium: ["a", "qu", "rare", "a", "r", "i-yod", "um"],
};

// ── Le découpage ──────────────────────────────────────────────────────────

const M = (g: string, cle: string, role: Role): Morceau => ({ g, cle, role });
interface Lecture { n: number; m: Morceau[] }
const lu = (g: string, cle: string, role: Role): Lecture => ({ n: g.length, m: [M(g, cle, role)] });

export interface OptionsDecoupage {
  /** Une syllabe seule (« che », « per ») : pas de lettre muette en finale. */
  syllabe?: boolean;
}

/**
 * Les morceaux d'un mot, ou d'une suite de mots (« chapeau de sorcier »).
 * Après « ils » ou « elles », -ent est la terminaison muette du verbe.
 */
export function decouper(texte: string, options: OptionsDecoupage = {}): Morceau[] {
  const mots = texte.toLowerCase().normalize("NFC").replace(/oe(?=u|il)/g, "œ").split(/[\s'’-]+/).filter(Boolean);
  const sortie: Morceau[] = [];
  let verbe = false;
  for (const mot of mots) {
    sortie.push(...decouperUnMot(mot, verbe, !!options.syllabe));
    verbe = mot === "ils" || mot === "elles";
  }
  return sortie;
}

function decouperUnMot(w: string, verbe: boolean, syllabe: boolean): Morceau[] {
  const exception = !syllabe && EXCEPTIONS[w];
  if (exception) return exception.map((cle) => M(w, cle, "V"));
  // d', l', j', qu' : la consonne élidée s'entend devant le mot suivant.
  if (w.length === 1 && estConsonne(w)) return [M(w, w === "c" ? "c-s" : w, "C")];
  const sortie: Morceau[] = [];
  for (let p = 0; p < w.length;) {
    const { n, m } = lire(w, p, verbe, syllabe);
    sortie.push(...m);
    p += n;
  }
  return sortie;
}

function lire(w: string, p: number, verbe: boolean, syllabe: boolean): Lecture {
  const L = w.length;
  const a = (s: string) => w.startsWith(s, p);
  /** La lettre k places plus loin. */
  const ch = (k: number) => w[p + k];
  const prec = w[p - 1];
  /** Le graphème de k lettres finit le mot — un s de pluriel peut le suivre. */
  const finit = (k: number) => !syllabe && (p + k === L || (p + k === L - 1 && w[L - 1] === "s"));
  /** Le graphème de k lettres est au bout — d'un mot, ou d'une syllabe seule. */
  const auBout = (k: number) => p + k === L || (!syllabe && p + k === L - 1 && w[L - 1] === "s");
  /** Une nasale : ni voyelle, ni n, ni m derrière (an-ge, mais a-nneau, a-mi). */
  const nasale = (k: number) => !estVoyelle(ch(k)) && ch(k) !== "n" && ch(k) !== "m" && ch(k) !== "h";
  /** m nasal : devant m, p, b — ou en fin de mot (nom, parfum). */
  const mNasal = (k: number) => ch(k) === "p" || ch(k) === "b" || p + k === L || (p + k === L - 1 && w[L - 1] === "s");
  const c0 = w[p];

  // ── Les groupes de voyelles, du plus long au plus court ──
  if (a("eau")) return lu("eau", "eau", "V");
  if (a("œu")) return lu("œu", "œu", "V");
  if (a("œ")) return lu("œ", "œu", "V");
  // ail, eil, euil, ouil en fin de mot ; aill, eill, euill, ouill dedans.
  for (const [v, cle] of [["eu", "eu"], ["ou", "ou"], ["ue", "œu"], ["a", "a"], ["u", "u"]] as const) {
    if (a(v + "ill")) return { n: v.length + 3, m: [M(v, cle, "V"), M("ill", "ill-yod", "C")] };
    if (v !== "u" && a(v + "il") && auBout(v.length + 2)) return { n: v.length + 2, m: [M(v, cle, "V"), M("il", "il", "C")] };
  }
  if (a("eill")) return lu("eill", "ill-yod", "V");
  if (a("eil") && auBout(3)) return lu("eil", "il", "V");
  if (a("ain") && nasale(3)) return lu("ain", "ain", "V");
  if (a("aim") && mNasal(3)) return lu("aim", "aim", "V");
  if (a("ein") && nasale(3)) return lu("ein", "ein", "V");
  if (a("oin") && nasale(3)) return lu("oin", "oin", "V");
  if (a("uin") && nasale(3)) return lu("u", "ui", "C"); // juin : u puis in
  if (a("aï")) return lu("a", "a", "V");
  if (a("ai") || a("aî")) return lu(w.slice(p, p + 2), "ai", "V");
  if ((a("ay") || a("oy") || a("uy") || a("ey")) && estVoyelle(ch(2))) return lu(w.slice(p, p + 2), "ay", "V");
  if (a("ei")) return lu("ei", "ei", "V");
  if (a("eu") || a("eû")) return lu(w.slice(p, p + 2), "eu", "V");
  if (a("où") || a("oû")) return lu(w.slice(p, p + 2), "où", "V");
  if (a("ou")) return lu("ou", "ou", "V");
  if (a("oi") || a("oî")) return lu(w.slice(p, p + 2), "oi", "V");
  if (a("au")) return lu("au", "au", "V");
  if (a("ui")) return lu("ui", "ui", "V");

  // ── Les voyelles nasales : on, an, in, un, en — om, am, im, em devant m, p, b ──
  if (c0 === "e" && (ch(1) === "n" || ch(1) === "m")) {
    if (a("enn")) return lu("enn", "enn", "V");
    if (a("emm")) return lu("emm", "emm", "V");
    if (verbe && a("ent") && p + 3 === L) return lu("ent", "ent-muet", "0");
    if (a("en") && nasale(2)) {
      if (prec === "i" || prec === "y" || prec === "é") {
        const enAn = ch(2) === "c" || IEN_AN.has(w);
        return lu("en", enAn ? "en" : "en-in", "V");
      }
      return lu("en", EN_IN.has(w) ? "en-in" : "en", "V");
    }
    if (a("em") && mNasal(2) && p + 2 < L) return lu("em", "em", "V");
  }
  if (c0 === "a" && a("an") && nasale(2)) return lu("an", "an", "V");
  if (c0 === "a" && a("am") && (ch(2) === "p" || ch(2) === "b")) return lu("am", "am", "V");
  if (c0 === "o" && a("on") && nasale(2)) return lu("on", "on", "V");
  if (c0 === "o" && a("om") && mNasal(2)) return lu("om", "om", "V");
  if (c0 === "i" && a("in") && nasale(2)) return lu("in", "in", "V");
  if (c0 === "i" && a("im") && (ch(2) === "p" || ch(2) === "b")) return lu("im", "im", "V");
  if (c0 === "ï" && a("ïn") && nasale(2)) return lu("ïn", "ï", "V");
  if (c0 === "u" && a("un") && nasale(2)) return lu("un", "un", "V");
  if (c0 === "u" && a("um") && mNasal(2)) return lu("um", "um", "V");
  if (c0 === "y" && (a("yn") || a("ym")) && (a("yn") ? nasale(2) : mNasal(2))) return lu(w.slice(p, p + 2), a("yn") ? "yn" : "ym", "V");

  // ── e : muet, [ə], [e] ou [ɛ] selon ce qui le suit ──
  if (c0 === "e") return lireE(w, p, syllabe);

  // ── i et y : voyelle ou yod ──
  if (c0 === "i") {
    if (a("ill")) {
      if (ILL_L.has(w)) return lu("i", "i", "V");
      return { n: 3, m: [M("i", "i", "V"), M("ll", "ill-yod", "C")] };
    }
    // Devant une voyelle, le yod (ciel, lion, piano) — sauf devant le e muet final (amie, scie, ils crient).
    const suite = w.slice(p + 1);
    const eMuet = !syllabe && (suite === "e" || suite === "es" || (verbe && suite === "ent"));
    if (estVoyelle(ch(1)) && !eMuet) return lu("i", "i-yod", "C");
    return lu("i", "i", "V");
  }
  if (c0 === "y") {
    if (p === 0 && estVoyelle(ch(1))) return lu("y", "y-yod", "C");
    return lu("y", "y-i", "V");
  }

  // ── Les autres voyelles ──
  const simples: Record<string, string> = { a: "a", à: "à", â: "â", ä: "a", é: "é", è: "è", ê: "ê", ë: "ë", î: "î", ï: "ï", o: "o", ô: "ô", ö: "o", u: "u", û: "û", ù: "où", ü: "u" };
  if (simples[c0]) return lu(c0, simples[c0], "V");

  // ── Les consonnes ──
  switch (c0) {
    case "s":
      if (a("sch")) return lu("sch", "rare", "C");
      if (a("sh")) return lu("sh", "rare", "C");
      if (a("ss")) return lu("ss", "ss", "C");
      if (a("sc") && faible(ch(2))) return lu("sc", "sc", "C");
      if (!syllabe && p === L - 1) return S_PRONONCE.has(w) ? lu("s", "finale", "C") : lu("s", "s-muet", "0");
      if (p === 0) return lu("s", "s", "C");
      if (estVoyelle(prec) && estVoyelle(ch(1))) return lu("s", "s-z", "C");
      return lu("s", "s-ss", "C");
    case "t":
      if (a("th")) return lu("th", "th", "C");
      if (a("tt")) return lu("tt", "cons-double", "C");
      if (a("tion") && prec !== "s" && prec !== "x") return lu("t", "t-s", "C");
      if (finit(1)) return T_PRONONCE.has(w) ? lu("t", "finale", "C") : lu("t", "t-muet", "0");
      return lu("t", "t", "C");
    case "d":
      if (a("dd")) return lu("dd", "cons-double", "C");
      if (finit(1)) return D_PRONONCE.has(w) ? lu("d", "finale", "C") : lu("d", "d-muet", "0");
      return lu("d", "d", "C");
    case "x":
      if (finit(1)) return X_KS.has(w) ? lu("x", "x-ks", "C") : lu("x", "x-muet", "0");
      // ex devant une voyelle : [gz] (exemple, examen) ; ailleurs [ks] (taxi, texte, excuse).
      if (prec === "e" && (p === 1 || w.startsWith("inex")) && (estVoyelle(ch(1)) || ch(1) === "h")) return lu("x", "x-gz", "C");
      return lu("x", "x-ks", "C");
    case "c":
      if (a("ch")) return lu("ch", CH_K.has(w) || ch(2) === "r" || ch(2) === "l" ? "ch-k" : "ch", "C");
      if (a("cqu")) return lu("cqu", "rare", "C");
      if (a("ck")) return lu("ck", "rare", "C");
      if (a("cc")) return lu("cc", "cc", "C");
      if (faible(ch(1))) return lu("c", "c-s", "C");
      if (finit(1) && (C_MUET.has(w) || prec === "n")) return lu("c", "muette-3", "0");
      return lu("c", "c-k", "C");
    case "ç":
      return lu("ç", "ç", "C");
    case "g":
      if (a("gn")) return lu("gn", "gn", "C");
      if (a("gu") && faible(ch(2))) return lu("gu", "gu", "C");
      if (a("gg")) return lu("gg", "gg", "C");
      if (a("ge") && "aoâô".includes(ch(2) ?? "-")) return lu("ge", "ge", "C");
      if (faible(ch(1))) return lu("g", "g-j", "C");
      if (finit(1) && prec === "n") return lu("g", "muette-3", "0");
      return lu("g", "g", "C");
    case "q":
      return a("qu") ? lu("qu", "qu", "C") : lu("q", "q", "C");
    case "h":
      return lu("h", "h", "0");
    case "p":
      if (a("ph")) return lu("ph", "ph", "C");
      if (a("pp")) return lu("pp", "cons-double", "C");
      if (prec === "m" && ch(1) === "t") return lu("p", "muette-3", "0");
      if (finit(1)) return P_PRONONCE.has(w) ? lu("p", "p", "C") : lu("p", "muette-3", "0");
      return lu("p", "p", "C");
    case "b":
      if (a("bb")) return lu("bb", "cons-double", "C");
      if (finit(1) && p > 0) return B_PRONONCE.has(w) ? lu("b", "b", "C") : lu("b", "muette-3", "0");
      return lu("b", "b", "C");
    case "m":
      return a("mm") ? lu("mm", "mm", "C") : lu("m", "m", "C");
    case "n":
      return a("nn") ? lu("nn", "nn", "C") : lu("n", "n", "C");
    case "l":
      if (a("ll")) return lu("ll", "ll", "C");
      if (finit(1) && L_MUET.has(w)) return lu("l", "muette-3", "0");
      return lu("l", "l", "C");
    case "r":
      return a("rr") ? lu("rr", "cons-double", "C") : lu("r", "r", "C");
    case "f":
      if (a("ff")) return lu("ff", "cons-double", "C");
      if (finit(1) && F_MUET.has(w)) return lu("f", "muette-3", "0");
      return lu("f", "f", "C");
    case "z":
      if (a("zz")) return lu("zz", "rare", "C");
      if (finit(1) && p > 0) return Z_PRONONCE.has(w) ? lu("z", "finale", "C") : lu("z", "z-muet", "0");
      return lu("z", "z", "C");
    case "v": case "j": case "k": case "w":
      return lu(c0, c0, "C");
  }
  return lu(c0, "inconnu", "C");
}

/** Le e, qui change de voix selon ce qui le suit. */
function lireE(w: string, p: number, syllabe: boolean): Lecture {
  const L = w.length;
  const reste = w.slice(p + 1);
  const c1 = w[p + 1], c2 = w[p + 2];
  const autreVoyelle = [...w.slice(0, p).replace(/[qg]u/g, "")].some(estVoyelle);
  // les, mes, des : « es » se lit [e] (guide CP, période 2).
  if (reste === "s" && !autreVoyelle) return lu("es", "es", "V");
  if (!syllabe) {
    // Le e final : muet, sauf dans le, je, me, te, de, ne — où il est la seule voyelle.
    if (reste === "") return lu("e", autreVoyelle ? "e-muet" : "e", autreVoyelle ? "0" : "V");
    if (reste === "s") return lu("e", "e-muet", "0");
    if (reste === "r" || reste === "rs") return lu("er", ER_PRONONCE.has(w) ? "finale" : "er-final", "V");
    if (reste === "z") return lu("ez", "ez", "V");
    if (reste === "t" || reste === "ts") return lu("et", ET_PRONONCE.has(w) ? "finale" : "et-final", "V");
    if (reste === "d" || reste === "ds") return lu("ed", "er-final", "V");
    // bec, sel, chef, cep : le e se lit [ɛ] et la consonne s'entend (guide CP, période 5).
    if (/^[clfp]s?$/.test(reste)) return lu(w.slice(p, p + 2), "e-finale", "V");
  } else if (estConsonne(c1) && p + 2 === L) {
    // Une syllabe fermée, seule : « chez », « quet », « per ».
    if (c1 === "z") return lu("ez", "ez", "V");
    if (c1 === "t") return lu("et", "et-final", "V");
    return lu("e", "e-cc", "V");
  }
  // Devant une consonne double : [ɛ] (belle, tresse, terre, galette).
  if (estConsonne(c1) && c1 === c2) {
    if ("lsrt".includes(c1)) return lu(w.slice(p, p + 3), "e-double", "V");
    return lu("e", "e-double", "V");
  }
  // Devant x, ou deux consonnes qui ne s'attachent pas : [ɛ] (exemple, merci, veste, insecte).
  if (c1 === "x") return lu("e", "e-cc", "V");
  if (estConsonne(c1) && estConsonne(c2) && !GROUPES.has(c1 + c2)) return lu("e", "e-cc", "V");
  // Dans une syllabe ouverte : [ə] (petit, cheval, renard).
  return lu("e", "e", "V");
}

// ── Ce qu'on en tire ──────────────────────────────────────────────────────

/** Les clés d'un mot, sans doublon. */
export const clesDe = (ms: Morceau[]) => [...new Set(ms.map((m) => m.cle))];

/**
 * La structure des syllabes : 0 si toutes sont V ou CV (la, li, a), 1 si
 * l'une est VC (il, or), 2 au-delà (CVC : jour ; CCV : fleur).
 */
export function structure(ms: Morceau[]): 0 | 1 | 2 {
  const roles = ms.filter((m) => m.role !== "0").map((m) => m.role).join("");
  const noyaux = [...roles.matchAll(/V/g)].map((x) => x.index!);
  if (!noyaux.length) return roles.length <= 1 ? 0 : 2;
  let niveau: 0 | 1 | 2 = 0;
  let attaque = noyaux[0];
  for (let k = 0; k < noyaux.length; k++) {
    const dernier = k === noyaux.length - 1;
    const entre = (dernier ? roles.length : noyaux[k + 1]) - noyaux[k] - 1;
    const coda = dernier ? entre : entre >= 2 ? 1 : 0;
    if (attaque > 1 || coda > 1 || (attaque === 1 && coda === 1)) return 2;
    if (coda === 1) niveau = 1;
    attaque = dernier ? 0 : entre - coda;
  }
  return niveau;
}
