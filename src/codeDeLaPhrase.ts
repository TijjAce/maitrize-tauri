// ── Le code de la phrase : les couleurs et les marques de l'analyse ─────────
//
// Souligner le groupe sujet en bleu, entourer le verbe en rouge, encadrer les
// compléments en vert : chaque classe a son code, et l'élève doit le
// retrouver pareil d'une feuille à l'autre. L'enseignant choisit le sien une
// fois, dans Aides à la tâche ; la carte du code, les consignes et les
// corrigés des feuilles de grammaire le reprennent.
//
// Les noms et les niveaux sont ceux des programmes en vigueur — cycle 2
// (arrêté du 22-10-2024), cycle 3 (arrêté du 10-4-2025) — et de la
// « Terminologie grammaticale » (Éduscol, 2020) avec le guide « La grammaire
// du français du CP à la 6e » (Éduscol, 2022) : le sujet et le verbe au CP ;
// le groupe sujet, les compléments non distingués et le groupe nominal au
// CE1 et au CE2 ; le COD, le COI, le complément circonstanciel et l'épithète
// au CM1 ; l'attribut du sujet et le complément du nom au CM2. « Prédicat » et
// « complément de phrase » (programmes de 2016) ne s'emploient plus. Pour les
// classes de mots : le nom, le déterminant, l'adjectif, le pronom et le verbe
// dès le CP, l'adverbe au CE2, la conjonction de coordination au CM1, la
// préposition et la conjonction de subordination au CM2.
//
// Éduscol fixe les noms, pas le code : aucun texte n'impose de couleur ni de
// marque, et le guide lui-même change de marque d'un exercice à l'autre. Il
// demande de partager les termes et les outils d'une classe à l'autre — d'où
// un code choisi une fois, que tout reprend.
//
// La couleur n'est jamais seule : chaque constituant a aussi sa marque —
// souligné, entouré, encadré… —, qui reste lisible photocopiée en noir et
// blanc (Cap école inclusive ; WCAG 1.4.1). Les mots marqués portent leur
// style en ligne : l'aperçu, l'impression, le PDF et les tablettes les
// montrent pareil, sans feuille de style à transmettre.

import { escapeHtml } from "./print";

export type Marque = "souligner" | "double" | "pointilles" | "tirets" | "ondule" | "entourer" | "encadrer" | "crochets" | "surligner" | "etiquette";

/** Les marques, et ce que la consigne fait faire pour chacune. */
export const MARQUES: { id: Marque; nom: string }[] = [
  { id: "souligner", nom: "souligné" },
  { id: "double", nom: "souligné deux fois" },
  { id: "pointilles", nom: "en pointillés" },
  { id: "tirets", nom: "en tirets" },
  { id: "ondule", nom: "ondulé" },
  { id: "entourer", nom: "entouré" },
  { id: "encadrer", nom: "encadré" },
  { id: "crochets", nom: "entre crochets" },
  { id: "surligner", nom: "surligné" },
  { id: "etiquette", nom: "étiquette dessous" },
];

/** Des couleurs qu'on nomme dans une consigne — « en bleu » —, assez foncées pour un trait fin. */
export const COULEURS: { id: string; nom: string; hex: string }[] = [
  { id: "bleu", nom: "bleu", hex: "#1d4ed8" },
  { id: "rouge", nom: "rouge", hex: "#d33a32" },
  { id: "vert", nom: "vert", hex: "#1f9a48" },
  { id: "orange", nom: "orange", hex: "#e8590c" },
  { id: "violet", nom: "violet", hex: "#7c3aed" },
  { id: "rose", nom: "rose", hex: "#db2777" },
  { id: "marron", nom: "marron", hex: "#8b5a2b" },
  { id: "jaune", nom: "jaune", hex: "#d4a106" },
  { id: "noir", nom: "noir", hex: "#1c2233" },
];

/** Les niveaux, du CP à la 6e : chacun ajoute ce que le programme y fait apprendre. */
export type NiveauCode = "CP" | "CE1" | "CE2" | "CM1" | "CM2" | "6e";
export const NIVEAUX_CODE: NiveauCode[] = ["CP", "CE1", "CE2", "CM1", "CM2", "6e"];
const rang = (n: NiveauCode) => NIVEAUX_CODE.indexOf(n);

export type FamilleCode = "groupes" | "classes";
export const FAMILLES_CODE: { id: FamilleCode; nom: string }[] = [
  { id: "groupes", nom: "Les groupes de la phrase" },
  { id: "classes", nom: "Les classes de mots" },
];

export type IdConstituant = string;

export interface MarqueDuConstituant { couleur: string; marque: Marque }

export interface Constituant {
  id: IdConstituant;
  famille: FamilleCode;
  /** Le niveau où on l'apprend ; `jusqua`, le dernier avant qu'un autre ne le précise. */
  depuis: NiveauCode;
  jusqua?: NiveauCode;
  /** Comme la consigne le nomme : « le groupe sujet ». */
  nom: string;
  /** Quand la phrase en a plusieurs : « les compléments d'objet direct ». */
  pluriel: string;
  /** Sur la carte du code : « Le groupe sujet ». */
  libelle: string;
  /** Un autre nom, jusqu'à un niveau : au CP, on dit « le sujet ». */
  avant?: { jusqua: NiveauCode; nom: string; pluriel: string; libelle: string; abrev: string };
  /** L'abréviation qu'on écrit sous le mot : celles de la Terminologie (N, Dét, Adj, V, Adv, GN, COD…), ou d'usage. */
  abrev: string;
  /** Comment le trouver : la manipulation, ou ce qui le fait reconnaître. */
  indice: string;
  /** Un exemple court où lui seul est marqué. */
  exemple: string;
  defaut: MarqueDuConstituant;
}

const m = (couleur: string, marque: Marque): MarqueDuConstituant => ({ couleur, marque });

export const CONSTITUANTS: Constituant[] = [
  // Les groupes de la phrase : P = GS + GV (+ GC), puis ce qui est dans le groupe verbal et dans le groupe nominal.
  { id: "sujet", famille: "groupes", depuis: "CP", nom: "le groupe sujet", pluriel: "les groupes sujets", libelle: "Le groupe sujet",
    avant: { jusqua: "CP", nom: "le sujet", pluriel: "les sujets", libelle: "Le sujet", abrev: "S" },
    abrev: "GS",
    indice: "Je peux l'encadrer par « C'est… qui », ou le remplacer par il, elle, ils, elles.", exemple: "[sujet:Le petit chat] boit son lait.",
    defaut: m("bleu", "souligner") },
  { id: "verbe", famille: "groupes", depuis: "CP", nom: "le verbe", pluriel: "les verbes", libelle: "Le verbe",
    abrev: "V",
    indice: "Il change si je change le temps ou la personne ; je peux l'encadrer par « ne… pas ».", exemple: "Le petit chat [verbe:boit] son lait.",
    defaut: m("rouge", "entourer") },
  { id: "complement", famille: "groupes", depuis: "CE1", jusqua: "CE2", nom: "les compléments", pluriel: "les compléments", libelle: "Les compléments",
    abrev: "C",
    indice: "Ils complètent la phrase : je peux en déplacer ou en supprimer certains, d'autres non.",
    exemple: "Le chat boit [complement:son lait] [complement:dans la cuisine].", defaut: m("vert", "encadrer") },
  { id: "gn", famille: "groupes", depuis: "CE1", nom: "le groupe nominal", pluriel: "les groupes nominaux", libelle: "Le groupe nominal",
    abrev: "GN",
    indice: "Un nom et les mots qui l'accompagnent — le déterminant, l'adjectif… — ; je peux le remplacer par il, elle, ils, elles.",
    exemple: "[gn:Le petit chat noir] dort.", defaut: m("noir", "crochets") },
  { id: "cod", famille: "groupes", depuis: "CM1", nom: "le complément d'objet direct", pluriel: "les compléments d'objet direct",
    libelle: "Le complément d'objet direct (COD)", abrev: "COD",
    indice: "Il suit le verbe, sans préposition ; je ne peux pas le déplacer ; je peux le remplacer par le, la, les.",
    exemple: "Léa mange [cod:une pomme].", defaut: m("vert", "encadrer") },
  { id: "coi", famille: "groupes", depuis: "CM1", nom: "le complément d'objet indirect", pluriel: "les compléments d'objet indirect",
    libelle: "Le complément d'objet indirect (COI)", abrev: "COI",
    indice: "Il suit le verbe et commence par une préposition (à, de) ; je peux le remplacer par lui, leur, en, y.",
    exemple: "Léa parle [coi:à son frère].", defaut: m("violet", "tirets") },
  { id: "cc", famille: "groupes", depuis: "CM1", nom: "le complément circonstanciel", pluriel: "les compléments circonstanciels",
    libelle: "Le complément circonstanciel", abrev: "CC",
    indice: "Je peux le déplacer et le supprimer : la phrase garde son sens. Il dit où, quand, pourquoi.",
    exemple: "[cc:Ce matin], Léa prend le bus.", defaut: m("orange", "ondule") },
  { id: "epithete", famille: "groupes", depuis: "CM1", nom: "l'épithète", pluriel: "les épithètes", libelle: "L'épithète",
    abrev: "Ép",
    indice: "Un adjectif à côté du nom, dans le groupe nominal ; je peux le supprimer.", exemple: "un [epithete:petit] chat [epithete:noir]",
    defaut: m("marron", "pointilles") },
  { id: "attribut", famille: "groupes", depuis: "CM2", nom: "l'attribut du sujet", pluriel: "les attributs du sujet", libelle: "L'attribut du sujet",
    abrev: "Attr",
    indice: "Il suit un verbe comme être, sembler, devenir, rester, et dit comment est le sujet ; je ne peux pas le supprimer.",
    exemple: "Le chat est [attribut:content].", defaut: m("rose", "double") },
  { id: "complementNom", famille: "groupes", depuis: "CM2", nom: "le complément du nom", pluriel: "les compléments du nom", libelle: "Le complément du nom",
    abrev: "CDN",
    indice: "Il complète un nom, après une préposition : de, à, en…", exemple: "la maison [complementNom:de Léa]", defaut: m("rose", "surligner") },
  // Les classes de mots.
  { id: "nom", famille: "classes", depuis: "CP", nom: "les noms", pluriel: "les noms", libelle: "Le nom",
    abrev: "N",
    indice: "Je peux mettre un déterminant devant : le, un… ; un nom propre commence par une majuscule.", exemple: "le petit [nom:chat] de [nom:Léa]",
    defaut: m("bleu", "etiquette") },
  { id: "determinant", famille: "classes", depuis: "CP", nom: "les déterminants", pluriel: "les déterminants", libelle: "Le déterminant",
    abrev: "Dét",
    indice: "Il est devant le nom : le, la, un, des, mon, ce…", exemple: "[determinant:le] petit chat", defaut: m("vert", "etiquette") },
  { id: "adjectif", famille: "classes", depuis: "CP", nom: "les adjectifs", pluriel: "les adjectifs", libelle: "L'adjectif",
    abrev: "Adj",
    indice: "Il dit comment est le nom ; il s'accorde avec lui.", exemple: "le [adjectif:petit] chat [adjectif:noir]", defaut: m("orange", "etiquette") },
  { id: "pronom", famille: "classes", depuis: "CP", nom: "les pronoms", pluriel: "les pronoms", libelle: "Le pronom",
    abrev: "Pron",
    indice: "Il remplace un nom ou un groupe nominal : il, elle, ils, elles…", exemple: "[pronom:Il] dort.", defaut: m("violet", "etiquette") },
  { id: "adverbe", famille: "classes", depuis: "CE2", nom: "les adverbes", pluriel: "les adverbes", libelle: "L'adverbe",
    abrev: "Adv",
    indice: "Il ne s'accorde pas ; il précise un verbe, un adjectif ou un autre adverbe : vite, très, hier…", exemple: "Il court [adverbe:vite].",
    defaut: m("marron", "etiquette") },
  { id: "conjonctionCoordination", famille: "classes", depuis: "CM1", nom: "les conjonctions de coordination", pluriel: "les conjonctions de coordination",
    libelle: "La conjonction de coordination", abrev: "Conj",
    indice: "Elle relie deux mots ou deux groupes : mais, ou, et, donc, or, ni, car.",
    exemple: "Léa [conjonctionCoordination:et] Tom jouent.", defaut: m("rose", "etiquette") },
  { id: "preposition", famille: "classes", depuis: "CM2", nom: "les prépositions", pluriel: "les prépositions", libelle: "La préposition",
    abrev: "Prép",
    indice: "Un petit mot invariable qui introduit un complément : à, de, dans, sur, pour, avec…", exemple: "Il va [preposition:à] l'école.",
    defaut: m("rouge", "etiquette") },
  { id: "conjonctionSubordination", famille: "classes", depuis: "CM2", nom: "les conjonctions de subordination", pluriel: "les conjonctions de subordination",
    libelle: "La conjonction de subordination", abrev: "Conj. sub.",
    indice: "Elle introduit une proposition subordonnée : que, quand, si, parce que…",
    exemple: "Je sors [conjonctionSubordination:quand] il fait beau.", defaut: m("noir", "etiquette") },
];

export const constituant = (id: IdConstituant) => CONSTITUANTS.find((c) => c.id === id);

/** Le constituant tel qu'on le nomme à ce niveau : « le sujet » au CP, « le groupe sujet » ensuite. */
export function nommePour(c: Constituant, niveau?: NiveauCode): Constituant {
  return niveau && c.avant && rang(niveau) <= rang(c.avant.jusqua) ? { ...c, nom: c.avant.nom, pluriel: c.avant.pluriel, libelle: c.avant.libelle, abrev: c.avant.abrev } : c;
}

/** Ce qu'on apprend à ce niveau — tout ce qui y est déjà, sauf ce qu'un autre a précisé —, d'une famille ou des deux. */
export const actifsPour = (niveau: NiveauCode, famille?: FamilleCode) => CONSTITUANTS.filter((c) =>
  rang(c.depuis) <= rang(niveau) && (!c.jusqua || rang(niveau) <= rang(c.jusqua)) && (!famille || c.famille === famille))
  .map((c) => nommePour(c, niveau));

export type CodeDeLaPhrase = Record<IdConstituant, MarqueDuConstituant>;

/** Le code proposé d'abord : le bleu, le rouge et le vert que l'enseignant a choisis pour sa feuille de grammaire, puis d'autres couleurs. */
export const CODE_PAR_DEFAUT: CodeDeLaPhrase = Object.fromEntries(CONSTITUANTS.map((c) => [c.id, c.defaut]));

/** La clé du réglage, sous « fabriquer: » comme ceux des ateliers (voir useReglages). */
export const CLE_CODE = "codePhrase";

const couleurDe = (id: string) => COULEURS.find((c) => c.id === id) ?? COULEURS[COULEURS.length - 1];

/** Le code enregistré, réparé : ce qui manque ou ne se connaît pas reprend le code par défaut. */
export function lireCode(brut: unknown): CodeDeLaPhrase {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const code: CodeDeLaPhrase = {};
  for (const c of CONSTITUANTS) {
    const x = (o[c.id] && typeof o[c.id] === "object" ? o[c.id] : {}) as Record<string, unknown>;
    code[c.id] = {
      couleur: COULEURS.some((k) => k.id === x.couleur) ? String(x.couleur) : c.defaut.couleur,
      marque: MARQUES.some((k) => k.id === x.marque) ? (x.marque as Marque) : c.defaut.marque,
    };
  }
  return code;
}

/** Le code de cet ordinateur, tel que l'atelier l'a gardé ; le code par défaut s'il n'y en a pas. */
export function codeActuel(): CodeDeLaPhrase {
  try {
    const brut = localStorage.getItem(`fabriquer:${CLE_CODE}`);
    return lireCode(brut ? JSON.parse(brut) : undefined);
  } catch {
    return CODE_PAR_DEFAUT;
  }
}

const marqueDe = (code: CodeDeLaPhrase, id: IdConstituant) => code[id] ?? constituant(id)?.defaut ?? m("noir", "souligner");

/**
 * Ce que fait faire la consigne pour un constituant : « Souligne le groupe
 * sujet en bleu. » `quoi` le nomme autrement quand il le faut : « le
 * complément », « les compléments du verbe ».
 */
export function etapeDuCode(code: CodeDeLaPhrase, id: IdConstituant, quoi?: string): string {
  const { couleur, marque } = marqueDe(code, id);
  const nom = quoi ?? constituant(id)?.nom ?? id;
  const en = `en ${couleurDe(couleur).nom}`;
  switch (marque) {
    case "souligner": return `Souligne ${nom} ${en}.`;
    case "double": return `Souligne deux fois ${nom} ${en}.`;
    case "pointilles": return `Souligne ${nom} en pointillés, ${en}.`;
    case "tirets": return `Souligne ${nom} en tirets, ${en}.`;
    case "ondule": return `Souligne ${nom} d'un trait ondulé, ${en}.`;
    case "entourer": return `Entoure ${nom} ${en}.`;
    case "encadrer": return `Encadre ${nom} ${en}.`;
    case "crochets": return `Mets ${nom} entre crochets, ${en}.`;
    case "surligner": return `Surligne ${nom} ${en}.`;
    case "etiquette": return `Écris « ${constituant(id)?.abrev ?? ""} » sous ${nom}, ${en}.`;
  }
}

/** Le style en ligne d'un mot marqué. */
function styleDe(x: MarqueDuConstituant): string {
  const c = couleurDe(x.couleur).hex;
  switch (x.marque) {
    case "souligner": return `border-bottom:2.5px solid ${c};padding-bottom:1px`;
    case "double": return `border-bottom:4.5px double ${c};padding-bottom:1px`;
    case "pointilles": return `border-bottom:2.5px dotted ${c};padding-bottom:1px`;
    case "tirets": return `border-bottom:2.5px dashed ${c};padding-bottom:1px`;
    case "ondule": return `text-decoration-line:underline;text-decoration-style:wavy;text-decoration-color:${c};text-decoration-thickness:1.5px;text-underline-offset:3px`;
    case "entourer": return `border:2px solid ${c};border-radius:3mm;padding:0 1mm`;
    case "encadrer": return `border:2px solid ${c};padding:0 1mm`;
    case "crochets": return "";
    // Un fond clair de la couleur : le texte reste noir et lisible.
    case "surligner": return `background:${c}38;padding:0 0.6mm;-webkit-box-decoration-break:clone;box-decoration-break:clone`;
    case "etiquette": return "display:inline-flex;flex-direction:column;align-items:center;line-height:1.05;vertical-align:baseline";
  }
}

/** Un groupe de mots marqué selon le code : déjà échappé, ou à échapper. */
export function marquer(code: CodeDeLaPhrase, id: IdConstituant, texte: string, dejaEchappe = false): string {
  const x = marqueDe(code, id);
  const t = dejaEchappe ? texte : escapeHtml(texte);
  if (x.marque === "crochets") {
    const c = couleurDe(x.couleur).hex;
    return `<span class="cp-${id}"><b style="color:${c}">[</b>${t}<b style="color:${c}">]</b></span>`;
  }
  if (x.marque === "etiquette") {
    // L'abréviation sous le mot, à sa couleur : elle se lit aussi en noir et blanc.
    const c = couleurDe(x.couleur).hex;
    return `<span class="cp-${id}" style="${styleDe(x)}">${t}<span style="display:block;font-size:0.6em;font-weight:800;color:${c}">${escapeHtml(constituant(id)?.abrev ?? "")}</span></span>`;
  }
  return `<span class="cp-${id}" style="${styleDe(x)}">${t}</span>`;
}

/** La couleur d'un constituant, pour l'écran. */
export const hexDe = (code: CodeDeLaPhrase, id: IdConstituant) => couleurDe(marqueDe(code, id).couleur).hex;

/**
 * Les étiquettes courtes des phrases analysées, du plus précis au plus
 * général : un COD, un complément circonstanciel sont, au CE1 et au CE2,
 * « des compléments » qu'on ne distingue pas encore. Une phrase s'écrit une
 * fois, au plus précis ; chaque niveau la marque avec ce qu'il connaît.
 */
const ETIQUETTES: Record<string, IdConstituant[]> = {
  S: ["sujet"], V: ["verbe"], C: ["complement"],
  COD: ["cod", "complement"], COI: ["coi", "complement"], CC: ["cc", "complement"],
  A: ["attribut", "complement"], CN: ["complementNom"], GN: ["gn"],
};

/** Le constituant qu'une étiquette marque à ce niveau ; sans niveau, le plus précis ; rien si le niveau ne le connaît pas encore. */
export function constituantDeLEtiquette(etiquette: string, niveau?: NiveauCode): IdConstituant | null {
  const chaine = ETIQUETTES[etiquette] ?? (constituant(etiquette) ? [etiquette] : null);
  if (!chaine) return null;
  if (!niveau) return chaine[0];
  const actifs = new Set(actifsPour(niveau).map((c) => c.id));
  // Le verbe est aussi une classe de mots : il garde sa marque partout.
  return chaine.find((id) => actifs.has(id) || id === "verbe") ?? null;
}

const ETIQUETTE = /\[([A-Za-z]+):([^\]]+)\]/g;

/** Une phrase analysée, sans ses marques : « Le chat boit son lait. » */
export const phraseSansAnalyse = (p: string) => p.replace(ETIQUETTE, "$2");

/**
 * Une phrase analysée — « [S:Le chat] [V:boit] [COD:son lait]. » —, chaque
 * groupe marqué selon le code. Avec un niveau, chaque étiquette prend le
 * constituant que ce niveau connaît ; ce qu'il ne connaît pas reste sans marque.
 */
export function phraseAnalysee(p: string, code: CodeDeLaPhrase, niveau?: NiveauCode): string {
  return escapeHtml(p).replace(ETIQUETTE, (_m, k: string, g: string) => {
    const id = constituantDeLEtiquette(k, niveau);
    return id ? marquer(code, id, g, true) : g;
  });
}

// ── La carte du code ──────────────────────────────────────────────────────
//
// L'aide à la tâche elle-même : le code, sous les yeux de l'élève pendant
// qu'il analyse. Pour chaque famille, une phrase d'exemple marquée, puis
// chaque constituant avec sa marque, un exemple court et ce qui le fait
// reconnaître. Des cartes pour l'élève, un bandeau pour la table, une affiche
// pour le mur ; plus le code est long, moins il en tient sur une page.

export type FormatCarte = "cartes" | "bandeau" | "affiche";

export const FORMATS_CARTE: { id: FormatCarte; nom: string; quoi: string }[] = [
  { id: "cartes", nom: "Les cartes", quoi: "une par élève, à garder dans le cahier ou la trousse : quatre par page, ou moins si le code est long" },
  { id: "bandeau", nom: "Le bandeau de la table", quoi: "des bandes à coller sur la table : trois par page, ou moins si le code est long" },
  { id: "affiche", nom: "L'affiche", quoi: "une page entière, pour le mur de la classe" },
];

/** Les phrases d'exemple des groupes, analysées au plus précis, et le niveau à partir duquel chacune a du sens. */
export const EXEMPLES_CODE: { phrase: string; depuis: NiveauCode }[] = [
  { phrase: "[S:Le petit chat] [V:boit] [COD:son lait].", depuis: "CP" },
  { phrase: "[S:Les enfants] [V:jouent] [CC:dans la cour].", depuis: "CP" },
  { phrase: "[CC:Ce matin], [S:Léa] [V:prépare] [COD:un gâteau].", depuis: "CP" },
  { phrase: "[CC:Dans la cour], [S:Léa] [V:parle] [COI:à son frère].", depuis: "CM1" },
  { phrase: "[S:Le chat de Léa] [V:semble] [A:content].", depuis: "CM2" },
];

/** Les exemples qui ont du sens à ce niveau. */
export const exemplesPour = (niveau: NiveauCode) => EXEMPLES_CODE.filter((e) => rang(e.depuis) <= rang(niveau));

/** Les phrases des classes de mots, chaque mot marqué selon sa classe : la plus riche que le niveau sait lire entièrement. */
const PHRASES_DES_CLASSES: { phrase: string; depuis: NiveauCode }[] = [
  { phrase: "[determinant:Le] [adjectif:petit] [nom:chat] [verbe:boit] : [pronom:il] [verbe:aime] [determinant:le] [nom:lait] [adjectif:chaud].", depuis: "CP" },
  { phrase: "[determinant:Le] [adjectif:petit] [nom:chat] [verbe:boit] [adverbe:vite] [determinant:son] [nom:lait] [adjectif:chaud].", depuis: "CE2" },
  { phrase: "[determinant:Le] [adjectif:petit] [nom:chat] [verbe:boit] [adverbe:vite] [conjonctionCoordination:et] [pronom:il] [verbe:dort].", depuis: "CM1" },
  { phrase: "[determinant:Le] [nom:chat] [verbe:sort] [preposition:dans] [determinant:la] [nom:cour] [conjonctionSubordination:quand] [pronom:il] [verbe:fait] [adjectif:beau].", depuis: "CM2" },
];
const phraseDesClasses = (niveau: NiveauCode) => [...PHRASES_DES_CLASSES].reverse().find((x) => rang(x.depuis) <= rang(niveau))!.phrase;

export interface ReglagesCarteCode {
  format: FormatCarte;
  niveau: NiveauCode;
  /** La phrase d'exemple des groupes, parmi celles du niveau. */
  exemple: number;
  /** Ce qui fait reconnaître chaque constituant : « C'est… qui », « ne… pas »… */
  indices: boolean;
  /** Les familles sur la carte. */
  familles: FamilleCode[];
  /** Les constituants qu'on laisse hors de la carte. */
  caches: IdConstituant[];
}

export const REGLAGES_CARTE_CODE: ReglagesCarteCode = { format: "cartes", niveau: "CE1", exemple: 0, indices: true, familles: ["groupes", "classes"], caches: [] };

export function reglagesCarteSurs(brut: Partial<ReglagesCarteCode>): ReglagesCarteCode {
  const niveau = NIVEAUX_CODE.includes(brut.niveau as NiveauCode) ? brut.niveau! : REGLAGES_CARTE_CODE.niveau;
  const familles = Array.isArray(brut.familles) ? FAMILLES_CODE.map((f) => f.id).filter((f) => brut.familles!.includes(f)) : REGLAGES_CARTE_CODE.familles;
  return {
    format: FORMATS_CARTE.some((f) => f.id === brut.format) ? brut.format! : "cartes",
    niveau,
    exemple: Number.isInteger(brut.exemple) && brut.exemple! >= 0 && brut.exemple! < exemplesPour(niveau).length ? brut.exemple! : 0,
    indices: brut.indices !== false,
    familles,
    caches: Array.isArray(brut.caches) ? brut.caches.filter((id) => typeof id === "string" && constituant(id)) : [],
  };
}

/** Les constituants de la carte, famille par famille : ceux du niveau, sauf ceux qu'on a laissés de côté. */
export function lignesDeLaCarte(r: ReglagesCarteCode): { famille: FamilleCode; constituants: Constituant[] }[] {
  return r.familles.map((famille) => ({ famille, constituants: actifsPour(r.niveau, famille).filter((c) => !r.caches.includes(c.id)) }))
    .filter((f) => f.constituants.length > 0);
}

function carteDuCode(code: CodeDeLaPhrase, r: ReglagesCarteCode, seulement?: FamilleCode): string {
  const exemple = exemplesPour(r.niveau)[r.exemple] ?? EXEMPLES_CODE[0];
  const sections = lignesDeLaCarte(r).filter((f) => !seulement || f.famille === seulement).map(({ famille, constituants }) => {
    const phrase = famille === "groupes" ? phraseAnalysee(exemple.phrase, code, r.niveau) : phraseAnalysee(phraseDesClasses(r.niveau), code, r.niveau);
    const lignes = constituants.map((c) => `<div class="cp-ligne"><div class="cp-echantillon">${marquer(code, c.id, c.libelle)}</div>`
      + `<div class="cp-court">${phraseAnalysee(c.exemple, code)}</div>${r.indices ? `<div class="cp-indice">${escapeHtml(c.indice)}</div>` : ""}</div>`).join("");
    return `<div class="cp-section"><div class="cp-famille">${escapeHtml(FAMILLES_CODE.find((f) => f.id === famille)!.nom)}</div>`
      + `<div class="cp-exemple">${phrase}</div><div class="cp-lignes">${lignes}</div></div>`;
  }).join("");
  return `<div class="cp-carte"><div class="cp-titre">Le code de la phrase <span class="cp-niveau">${escapeHtml(r.niveau)}</span></div>${sections}</div>`;
}

/** Combien de cartes tiennent sur une page, selon le format et le nombre de lignes du code. */
export function cartesParPage(r: ReglagesCarteCode): number {
  const lignes = nombreDeLignes(r);
  if (r.format === "affiche") return 1;
  if (r.format === "bandeau") return lignes <= 4 ? 3 : lignes <= 8 ? 2 : 1;
  return lignes <= 4 ? 4 : lignes <= 9 ? 2 : 1;
}

/** Les lignes de la carte : un titre par famille, une ligne par élément. */
const nombreDeLignes = (r: ReglagesCarteCode) => lignesDeLaCarte(r).reduce((n, f) => n + f.constituants.length + 1, 0);

/** La carte du code, au format choisi : la feuille à imprimer. Une longue affiche met chaque famille sur sa page. */
export function htmlCodeDeLaPhrase(code: CodeDeLaPhrase, r: ReglagesCarteCode): string {
  const n = cartesParPage(r);
  const page = (carte: string, k: number) => `<div class="page"><div class="cp-planche">${Array.from({ length: k }, () => carte).join("")}</div></div>`;
  const pages = r.format === "affiche" && nombreDeLignes(r) > 9 && lignesDeLaCarte(r).length > 1
    ? lignesDeLaCarte(r).map((f) => page(carteDuCode(code, r, f.famille), 1)).join("")
    : page(carteDuCode(code, r), n);
  return `<div class="feuille cp cp-${r.format} cp-par${n}">${pages}</div>`;
}

export const STYLE_CODE_PHRASE = `
  .feuille.cp .cp-planche { display: grid; gap: 0; }
  .feuille.cp .cp-carte { border: 1px dashed #9aa0b4; padding: 5mm 6mm; display: flex; flex-direction: column; gap: 3mm; box-sizing: border-box; overflow: hidden; }
  .feuille.cp .cp-titre { font-weight: 800; color: #1c2233; }
  .feuille.cp .cp-niveau { font-weight: 600; color: #687087; margin-left: 2mm; }
  .feuille.cp .cp-section { display: flex; flex-direction: column; gap: 2mm; }
  .feuille.cp .cp-famille { font-weight: 800; color: #4a5168; text-transform: uppercase; letter-spacing: .4px; }
  .feuille.cp .cp-exemple { line-height: 2.3; }
  .feuille.cp .cp-lignes { display: grid; gap: 2.5mm 6mm; }
  .feuille.cp .cp-ligne { break-inside: avoid; }
  .feuille.cp .cp-echantillon { font-weight: 700; line-height: 1.9; }
  .feuille.cp .cp-court { line-height: 2.2; }
  .feuille.cp .cp-indice { color: #4a5168; line-height: 1.35; }
  /* Quatre cartes par page : deux par rangée. */
  .feuille.cp-cartes.cp-par4 .cp-planche { grid-template-columns: 1fr 1fr; grid-auto-rows: 124mm; }
  .feuille.cp-cartes.cp-par4 .cp-titre { font-size: 17px; }
  .feuille.cp-cartes.cp-par4 .cp-famille { font-size: 10px; }
  .feuille.cp-cartes.cp-par4 .cp-exemple { font-size: 18px; }
  .feuille.cp-cartes.cp-par4 .cp-echantillon { font-size: 16px; }
  .feuille.cp-cartes.cp-par4 .cp-court { font-size: 13px; }
  .feuille.cp-cartes.cp-par4 .cp-indice { font-size: 12px; }
  /* Deux cartes par page, sur toute la largeur : les lignes sur deux colonnes. */
  .feuille.cp-cartes.cp-par2 .cp-planche { grid-template-columns: 1fr; grid-auto-rows: 124mm; }
  .feuille.cp-cartes.cp-par2 .cp-lignes, .feuille.cp-par1 .cp-lignes { grid-template-columns: 1fr 1fr; }
  .feuille.cp-cartes.cp-par2 .cp-titre { font-size: 16px; }
  .feuille.cp-cartes.cp-par2 .cp-famille { font-size: 9.5px; }
  .feuille.cp-cartes.cp-par2 .cp-exemple { font-size: 16px; line-height: 1.9; }
  .feuille.cp-cartes.cp-par2 .cp-echantillon { font-size: 13.5px; line-height: 1.7; }
  .feuille.cp-cartes.cp-par2 .cp-court { font-size: 11.5px; line-height: 1.75; }
  .feuille.cp-cartes.cp-par2 .cp-indice { font-size: 10.5px; }
  /* Le bandeau : la largeur de la table. */
  .feuille.cp-bandeau.cp-par3 .cp-planche { grid-template-columns: 1fr; grid-auto-rows: 84mm; }
  .feuille.cp-bandeau.cp-par2 .cp-planche { grid-template-columns: 1fr; grid-auto-rows: 124mm; }
  .feuille.cp-bandeau .cp-lignes { grid-template-columns: repeat(3, 1fr); }
  .feuille.cp-bandeau .cp-titre { font-size: 15px; }
  .feuille.cp-bandeau .cp-famille { font-size: 9.5px; }
  .feuille.cp-bandeau .cp-exemple { font-size: 16px; line-height: 1.9; }
  .feuille.cp-bandeau .cp-echantillon { font-size: 13px; line-height: 1.7; }
  .feuille.cp-bandeau .cp-court { font-size: 11px; line-height: 1.7; }
  .feuille.cp-bandeau .cp-indice { font-size: 10px; }
  /* Une seule carte, ou l'affiche : la page entière. */
  .feuille.cp-par1 .cp-planche { grid-template-columns: 1fr; grid-auto-rows: 250mm; }
  .feuille.cp-cartes.cp-par1 .cp-titre, .feuille.cp-bandeau.cp-par1 .cp-titre { font-size: 18px; }
  .feuille.cp-cartes.cp-par1 .cp-exemple, .feuille.cp-bandeau.cp-par1 .cp-exemple { font-size: 17px; }
  .feuille.cp-cartes.cp-par1 .cp-echantillon, .feuille.cp-bandeau.cp-par1 .cp-echantillon { font-size: 14px; }
  .feuille.cp-cartes.cp-par1 .cp-court, .feuille.cp-bandeau.cp-par1 .cp-court { font-size: 12px; }
  .feuille.cp-cartes.cp-par1 .cp-indice, .feuille.cp-bandeau.cp-par1 .cp-indice { font-size: 11px; }
  .feuille.cp-affiche .cp-carte { border: none; padding: 2mm; gap: 6mm; }
  .feuille.cp-affiche .cp-titre { font-size: 28px; }
  .feuille.cp-affiche .cp-famille { font-size: 13px; }
  .feuille.cp-affiche .cp-exemple { font-size: 24px; line-height: 2; }
  .feuille.cp-affiche .cp-lignes { gap: 4mm 8mm; }
  .feuille.cp-affiche .cp-echantillon { font-size: 18px; }
  .feuille.cp-affiche .cp-court { font-size: 14px; }
  .feuille.cp-affiche .cp-indice { font-size: 12px; }
`;
