// La conjugaison du cycle 2 : être et avoir, les verbes du 1er groupe, et
// au CE2 les verbes irréguliers du 3e groupe que nomme le programme — faire,
// aller, dire, venir, pouvoir, voir, vouloir, prendre —, au présent, à
// l'imparfait, au futur et au passé composé de l'indicatif.
//
// Programme de français du cycle 2 (2024) : au CP, être et avoir au présent ;
// au CE1, « au présent, à l'imparfait, au futur puis au passé composé » être,
// avoir et les verbes du 1er groupe ; au CE2, les huit verbes irréguliers en
// plus. Les verbes du 1er groupe retenus évitent les changements d'accent
// (lever, acheter) et de consonne (appeler, jeter) ; manger et commencer
// gardent leur e et leur cédille devant a et o.

export type Temps = "present" | "imparfait" | "futur" | "passeCompose";
/** Le nom de chaque temps, et ses formes contractées : au présent, du présent ; à l'imparfait, de l'imparfait. */
export const TEMPS: { id: Temps; nom: string; au: string; du: string }[] = [
  { id: "present", nom: "le présent", au: "au présent", du: "du présent" },
  { id: "imparfait", nom: "l'imparfait", au: "à l'imparfait", du: "de l'imparfait" },
  { id: "futur", nom: "le futur", au: "au futur", du: "du futur" },
  { id: "passeCompose", nom: "le passé composé", au: "au passé composé", du: "du passé composé" },
];
export const tempsDe = (id: Temps) => TEMPS.find((t) => t.id === id)!;
export const PERSONNES = ["je", "tu", "il", "nous", "vous", "ils"] as const;

type Six = [string, string, string, string, string, string];

const AVOIR: Record<Temps, Six> = {
  present: ["ai", "as", "a", "avons", "avez", "ont"],
  imparfait: ["avais", "avais", "avait", "avions", "aviez", "avaient"],
  futur: ["aurai", "auras", "aura", "aurons", "aurez", "auront"],
  passeCompose: ["ai eu", "as eu", "a eu", "avons eu", "avez eu", "ont eu"],
};
const ETRE: Record<Temps, Six> = {
  present: ["suis", "es", "est", "sommes", "êtes", "sont"],
  imparfait: ["étais", "étais", "était", "étions", "étiez", "étaient"],
  futur: ["serai", "seras", "sera", "serons", "serez", "seront"],
  passeCompose: ["ai été", "as été", "a été", "avons été", "avez été", "ont été"],
};

/** Les huit verbes irréguliers du CE2 : présent, imparfait, futur, et le participe passé avec son auxiliaire. */
const IRREGULIERS: Record<string, { present: Six; imparfait: Six; futur: Six; participe: string; etre?: boolean }> = {
  faire: { present: ["fais", "fais", "fait", "faisons", "faites", "font"], imparfait: ["faisais", "faisais", "faisait", "faisions", "faisiez", "faisaient"], futur: ["ferai", "feras", "fera", "ferons", "ferez", "feront"], participe: "fait" },
  aller: { present: ["vais", "vas", "va", "allons", "allez", "vont"], imparfait: ["allais", "allais", "allait", "allions", "alliez", "allaient"], futur: ["irai", "iras", "ira", "irons", "irez", "iront"], participe: "allé", etre: true },
  dire: { present: ["dis", "dis", "dit", "disons", "dites", "disent"], imparfait: ["disais", "disais", "disait", "disions", "disiez", "disaient"], futur: ["dirai", "diras", "dira", "dirons", "direz", "diront"], participe: "dit" },
  venir: { present: ["viens", "viens", "vient", "venons", "venez", "viennent"], imparfait: ["venais", "venais", "venait", "venions", "veniez", "venaient"], futur: ["viendrai", "viendras", "viendra", "viendrons", "viendrez", "viendront"], participe: "venu", etre: true },
  pouvoir: { present: ["peux", "peux", "peut", "pouvons", "pouvez", "peuvent"], imparfait: ["pouvais", "pouvais", "pouvait", "pouvions", "pouviez", "pouvaient"], futur: ["pourrai", "pourras", "pourra", "pourrons", "pourrez", "pourront"], participe: "pu" },
  voir: { present: ["vois", "vois", "voit", "voyons", "voyez", "voient"], imparfait: ["voyais", "voyais", "voyait", "voyions", "voyiez", "voyaient"], futur: ["verrai", "verras", "verra", "verrons", "verrez", "verront"], participe: "vu" },
  vouloir: { present: ["veux", "veux", "veut", "voulons", "voulez", "veulent"], imparfait: ["voulais", "voulais", "voulait", "voulions", "vouliez", "voulaient"], futur: ["voudrai", "voudras", "voudra", "voudrons", "voudrez", "voudront"], participe: "voulu" },
  prendre: { present: ["prends", "prends", "prend", "prenons", "prenez", "prennent"], imparfait: ["prenais", "prenais", "prenait", "prenions", "preniez", "prenaient"], futur: ["prendrai", "prendras", "prendra", "prendrons", "prendrez", "prendront"], participe: "pris" },
};

export const VERBES_IRREGULIERS = Object.keys(IRREGULIERS);
/** Des verbes du 1er groupe sans piège d'accent ni de consonne doublée. */
export const VERBES_1ER_GROUPE = ["chanter", "jouer", "parler", "danser", "regarder", "marcher", "dessiner", "écouter", "aimer", "porter", "laver", "trouver", "manger", "nager", "ranger", "commencer", "lancer"];

/** Devant a et o, manger garde son e, commencer prend une cédille. */
function radicalDevant(radical: string, terminaison: string): string {
  if (!/^[ao]/.test(terminaison)) return radical;
  if (radical.endsWith("g")) return `${radical}e`;
  if (radical.endsWith("c")) return `${radical.slice(0, -1)}ç`;
  return radical;
}

/** Les six formes d'un verbe à un temps, sans le pronom. */
export function formes(verbe: string, temps: Temps): Six {
  if (verbe === "être") return ETRE[temps];
  if (verbe === "avoir") return AVOIR[temps];
  const irr = IRREGULIERS[verbe];
  if (irr) {
    if (temps !== "passeCompose") return irr[temps];
    const aux = irr.etre ? ETRE.present : AVOIR.present;
    // Avec être, le participe s'accorde : au pluriel, -s (au masculin).
    return aux.map((a, i) => `${a} ${irr.participe}${irr.etre && i >= 3 ? "s" : ""}`) as Six;
  }
  if (!verbe.endsWith("er")) throw new Error(`Verbe hors du programme : ${verbe}`);
  const r = verbe.slice(0, -2);
  const avec = (ts: Six) => ts.map((t) => radicalDevant(r, t) + t) as Six;
  if (temps === "present") return avec(["e", "es", "e", "ons", "ez", "ent"]);
  if (temps === "imparfait") return avec(["ais", "ais", "ait", "ions", "iez", "aient"]);
  if (temps === "futur") return ["ai", "as", "a", "ons", "ez", "ont"].map((t) => verbe + t) as Six;
  return AVOIR.present.map((a) => `${a} ${r}é`) as Six;
}

/** Le pronom devant la forme : « j' » devant une voyelle ou un h muet. */
export function avecPronom(pronom: string, forme: string): string {
  return pronom === "je" && /^[aeiouyéèêh]/i.test(forme) ? `j'${forme}` : `${pronom} ${forme}`;
}

/** La conjugaison entière : « je chante », « tu chantes »… */
export const conjugaison = (verbe: string, temps: Temps) => formes(verbe, temps).map((f, i) => avecPronom(PERSONNES[i], f));

/** Le radical et la terminaison d'une forme simple d'un verbe du 1er groupe : « chant » + « ons ». */
export function radicalEtTerminaison(verbe: string, forme: string): { radical: string; terminaison: string } {
  const r = verbe.slice(0, -2);
  // Nous mangeons, je commençais : le e ou la cédille restent au radical ; la terminaison est la même que pour chanter.
  const modifie = radicalDevant(r, "a");
  const k = modifie !== r && forme.startsWith(modifie) ? modifie.length : r.length;
  return { radical: forme.slice(0, k), terminaison: forme.slice(k) };
}

/** Les verbes que chaque classe conjugue, aux temps de sa classe. */
export const AU_PROGRAMME: Record<"CP" | "CE1" | "CE2", { verbes: string[]; temps: Temps[] }> = {
  CP: { verbes: ["être", "avoir"], temps: ["present"] },
  CE1: { verbes: ["être", "avoir", ...VERBES_1ER_GROUPE], temps: ["present", "imparfait", "futur", "passeCompose"] },
  CE2: { verbes: ["être", "avoir", ...VERBES_1ER_GROUPE, ...VERBES_IRREGULIERS], temps: ["present", "imparfait", "futur", "passeCompose"] },
};
