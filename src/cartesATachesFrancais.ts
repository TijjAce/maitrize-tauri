// Les cartes à tâches de français : lire et écrire, étude de la langue.
//
// Les phrases et les mots viennent des banques de Fabriquer — les sons et
// leurs mots déchiffrables, les sujets à remplacer, les mots à accents —,
// complétées ici de phrases qui ne laissent qu'une réponse. Une carte qui en
// admet deux met l'élève en faute à tort : une phrase impérative peut finir
// par un point ou par un point d'exclamation, elle n'a donc pas sa place
// parmi les phrases à ponctuer ; un mot isolé peut être nom ou verbe (« la
// marche », « il marche »), on le montre donc dans sa phrase.
//
// Les fausses réponses sont de vraies formes : une autre personne du même
// verbe, un autre pronom, un autre accent. On ne montre pas de mot mal écrit.

import {
  BLANC, BLANC_LETTRE, auPlusCE2, classesDe, dansLOrdre, enGrand, parmi, propositions, rang, sansChoix, texte,
  type Classe, type TypeDeCarte,
} from "./cartesATachesOutils";
import { melanger } from "./hasard";
import { SONS, contientLeSon } from "./lectureSons";
import { AU_PROGRAMME, formes, tempsDe, type Temps } from "./conjugaison";
import { MOTS_ACCENTS } from "./orthographe";
import { GENRE_NOMBRE_CP, PHRASE_OU_PAS, SUJETS_A_REMPLACER } from "./grammaire";

const PROGRAMME_FR_C2 = "Programme de français du cycle 2 (2024)";
const PROGRAMME_FR_C3 = "Programme de français du cycle 3 (2025)";
const programmesFr = (classes: Classe[]) => {
  const c2 = classes.some((c) => rang(c) <= rang("CE2")), c3 = classes.some((c) => rang(c) >= rang("CM1"));
  return [c2 ? PROGRAMME_FR_C2 : "", c3 ? PROGRAMME_FR_C3 : ""].filter(Boolean).join(" ; ");
};

/** Le mot souligné dans sa phrase : « Le [chat] dort. » */
const souligne = (phrase: string) => texte(phrase).replace(/\[([^\]]+)\]/, `<u><b>$1</b></u>`);

// ── Le son ────────────────────────────────────────────────────────────────

/**
 * Les sons des cartes : ceux dont l'écriture dit sûrement s'ils sont là. Les
 * voyelles [o], [é], [è] s'écrivent de trop de façons — « vert » fait
 * entendre [è] sans è, ni ai, ni ei — : un intrus pourrait les contenir.
 */
const SONS_DES_CARTES = ["ou", "on", "an", "in", "oi", "ch", "gn", "m", "l", "r", "p", "t", "v", "b", "f"];
/** Ce qui fait entendre le son sans être l'un de ses graphèmes : un intrus qui l'a n'en est pas un. */
const AUSSI: Record<string, string[]> = { in: ["un", "um", "yn", "ym", "en"], ou: ["où", "oû"], oi: ["oy"], ch: ["sh"] };

/** Le son comme on l'écrit pour la classe : [ou], [on], [ch]. */
const nomDuSon = (id: string) => `[${SONS.find((s) => s.id === id)?.graphemes[0] ?? id}]`;

const SON: TypeDeCarte = {
  id: "son", nom: "Dans quel mot entends-tu le son ?", domaine: "Lire et écrire", classes: ["CP", "CE1"], formats: ["pinces"],
  source: PROGRAMME_FR_C2 + " : identifier les phonèmes, les correspondances entre graphèmes et phonèmes",
  options: [{
    cle: "son", libelle: "Le son",
    valeurs: () => [["tous", "Les sons de la liste, mêlés"], ...SONS_DES_CARTES.map((id): [string, string] => [id, nomDuSon(id)])],
    defaut: () => "tous",
  }],
  tirer(ctx) {
    const id = ctx.options.son === "tous" || !SONS_DES_CARTES.includes(ctx.options.son) ? ctx.pioche("sons", SONS_DES_CARTES) : ctx.options.son;
    const son = SONS.find((s) => s.id === id);
    if (!son) return null;
    const mot = ctx.pioche(`son:${id}`, son.mots);
    const aussi = AUSSI[id] ?? [];
    const vivier = [...new Set(SONS.filter((s) => s.id !== id).flatMap((s) => s.mots))]
      .filter((m) => !contientLeSon(m, son) && !aussi.some((g) => m.toLowerCase().includes(g)));
    const p = propositions(ctx.alea, texte(mot), melanger(ctx.alea, vivier).map(texte));
    return {
      question: `Dans quel mot entends-tu le son ${nomDuSon(id)} ?`, visuel: enGrand(texte(nomDuSon(id)), "ct-son"), ...p,
      reponse: texte(mot), cle: `${id}:${mot}`,
    };
  },
};

// ── Majuscules et minuscules ──────────────────────────────────────────────

/**
 * Les lettres qu'on confond avec chacune : b, d, p, q d'abord. Jamais le i
 * avec le l : en écriture bâton, I majuscule et l minuscule ont le même dessin.
 */
const SOSIES: Record<string, string> = {
  a: "oed", b: "dpq", c: "eos", d: "bpq", e: "cao", f: "tlj", g: "qjy", h: "nkb", i: "jtf", j: "igy", k: "hxl", l: "thk", m: "nuw",
  n: "muh", o: "ace", p: "qbd", q: "pdg", r: "nvt", s: "zce", t: "fli", u: "nvm", v: "wuy", w: "vmu", x: "kzy", y: "vgj", z: "sxn",
};

const LETTRE: TypeDeCarte = {
  id: "lettre", nom: "Majuscule et minuscule", domaine: "Lire et écrire", classes: ["GS", "CP"], formats: ["pinces"],
  source: "Programme de l'école maternelle (2021) et " + PROGRAMME_FR_C2 + " : reconnaître les lettres dans les trois écritures",
  options: [{
    cle: "sens", libelle: "La lettre montrée",
    valeurs: () => [["majuscule", "La majuscule : on cherche la minuscule"], ["minuscule", "La minuscule : on cherche la majuscule"]],
    defaut: () => "majuscule",
  }],
  tirer(ctx) {
    const l = ctx.pioche("lettres", Object.keys(SOSIES));
    const versMinuscule = ctx.options.sens !== "minuscule";
    const ecrire = (x: string) => (versMinuscule ? x : x.toUpperCase());
    const p = propositions(ctx.alea, ecrire(l), SOSIES[l].split("").map(ecrire));
    return {
      question: versMinuscule ? `Quelle est la minuscule de ${l.toUpperCase()} ?` : `Quelle est la majuscule de ${l} ?`,
      visuel: enGrand(versMinuscule ? l.toUpperCase() : l, "ct-lettre"), ...p, reponse: ecrire(l), cle: l,
    };
  },
};

// ── La ponctuation ────────────────────────────────────────────────────────

/** Des phrases qui n'admettent qu'un signe : les impératives, qui prennent un point ou un point d'exclamation, n'y sont pas. */
export const A_PONCTUER: { phrase: string; point: "." | "?" | "!" }[] = [
  { phrase: "Le vent souffle fort", point: "." }, { phrase: "Où est ton manteau", point: "?" }, { phrase: "Quelle belle journée", point: "!" },
  { phrase: "Est-ce que tu viens avec nous", point: "?" }, { phrase: "Nous mangeons à la cantine", point: "." }, { phrase: "Comme tu as grandi", point: "!" },
  { phrase: "Le chat dort sur le canapé", point: "." }, { phrase: "Quand partons-nous en vacances", point: "?" }, { phrase: "Que ce gâteau est bon", point: "!" },
  { phrase: "Mon frère joue au football", point: "." }, { phrase: "Pourquoi pleures-tu", point: "?" }, { phrase: "Quel joli dessin", point: "!" },
  { phrase: "La maîtresse lit une histoire", point: "." }, { phrase: "As-tu fini ton travail", point: "?" }, { phrase: "Comme il fait froid", point: "!" },
  { phrase: "Les oiseaux construisent un nid", point: "." }, { phrase: "Combien de crayons as-tu", point: "?" }, { phrase: "Quelle surprise", point: "!" },
  { phrase: "Il pleut depuis ce matin", point: "." }, { phrase: "Est-ce que le bus est arrivé", point: "?" }, { phrase: "Quel beau château de sable", point: "!" },
  { phrase: "Léa range ses livres dans son cartable", point: "." }, { phrase: "Qui a mangé la dernière part de tarte", point: "?" }, { phrase: "Que la mer est belle ce soir", point: "!" },
];

/** Un signe en grand : un point se voit mal en corps de texte. */
const signe = (s: string) => `<span class="ct-signe">${texte(s)}</span>`;

const PONCTUATION: TypeDeCarte = {
  id: "ponctuation", nom: "Point, point d'interrogation, point d'exclamation", domaine: "Étude de la langue", classes: classesDe("CP", "CE2"), formats: ["pinces"],
  source: PROGRAMME_FR_C2 + " : la phrase et sa ponctuation, les types de phrases",
  tirer(ctx) {
    const p = ctx.pioche("ponctuation", A_PONCTUER);
    return {
      question: "Quel signe faut-il à la fin de la phrase ?", visuel: enGrand(`${texte(p.phrase)} ${BLANC}`, "ct-phrase"),
      ...dansLOrdre([".", "?", "!"].map(signe), signe(p.point)), reponse: texte(`${p.phrase} ${p.point}`.replace(" .", ".")), cle: p.phrase,
    };
  },
};

// ── Une phrase ou pas ─────────────────────────────────────────────────────

/** Une phrase : du sens, une majuscule, un point. */
export const PHRASES_OU_PAS: { texte: string; phrase: boolean }[] = [
  ...PHRASE_OU_PAS.map(({ texte: t, phrase }) => ({ texte: t, phrase })),
  { texte: "Le soleil brille dans le ciel.", phrase: true }, { texte: "la pluie tombe sur le toit", phrase: false },
  { texte: "Pomme la mange Tom.", phrase: false }, { texte: "Mon chien aime les os.", phrase: true },
  { texte: "Dans le jardin du.", phrase: false }, { texte: "Où vas-tu ?", phrase: true },
  { texte: "Les enfants jouent au ballon", phrase: false }, { texte: "Quelle belle fleur !", phrase: true },
  { texte: "Bleu mange vite chaise.", phrase: false }, { texte: "papa prépare le dîner.", phrase: false },
  { texte: "Nous allons à la piscine.", phrase: true }, { texte: "Le chat noir et.", phrase: false },
];

const PHRASE: TypeDeCarte = {
  id: "phrase", nom: "Est-ce une phrase ?", domaine: "Étude de la langue", classes: ["CP", "CE1"], formats: ["pinces"],
  source: PROGRAMME_FR_C2 + " : identifier une phrase — du sens, une majuscule, un point",
  tirer(ctx) {
    const p = ctx.pioche("phrases", PHRASES_OU_PAS);
    const juste = p.phrase ? "oui" : "non";
    return { question: "Est-ce une phrase ?", visuel: enGrand(texte(p.texte), "ct-phrase"), ...dansLOrdre(["oui", "non"], juste), reponse: juste, cle: p.texte };
  },
};

// ── La classe des mots ────────────────────────────────────────────────────

type ClasseDeMot = "nom" | "nom propre" | "verbe" | "déterminant" | "adjectif" | "pronom" | "adverbe" | "préposition" | "conjonction";

/** Le mot entre crochets, dans une phrase qui ne lui laisse qu'une classe. */
export const MOTS_EN_PHRASE: { phrase: string; classe: ClasseDeMot }[] = [
  { phrase: "Le [chat] dort sur le lit.", classe: "nom" }, { phrase: "Ma [sœur] lit un livre.", classe: "nom" },
  { phrase: "Les [enfants] jouent dans la cour.", classe: "nom" }, { phrase: "Tom mange une [pomme].", classe: "nom" },
  { phrase: "Le [vent] souffle fort.", classe: "nom" }, { phrase: "Il range ses [crayons].", classe: "nom" },
  { phrase: "La [maison] est grande.", classe: "nom" }, { phrase: "Nous regardons les [étoiles].", classe: "nom" },
  { phrase: "[Léa] joue au ballon.", classe: "nom propre" }, { phrase: "Nous partons à [Marseille].", classe: "nom propre" },
  { phrase: "Mon chien s'appelle [Rex].", classe: "nom propre" }, { phrase: "[Paris] est une grande ville.", classe: "nom propre" },
  { phrase: "J'ai écrit à [Nadia].", classe: "nom propre" },
  { phrase: "Le chat [dort] sur le lit.", classe: "verbe" }, { phrase: "Les enfants [jouent] dans la cour.", classe: "verbe" },
  { phrase: "Nous [chantons] une chanson.", classe: "verbe" }, { phrase: "Tom [mange] une pomme.", classe: "verbe" },
  { phrase: "Elle [court] très vite.", classe: "verbe" }, { phrase: "Vous [regardez] un film.", classe: "verbe" },
  { phrase: "Le bébé [pleure].", classe: "verbe" }, { phrase: "Je [range] ma chambre.", classe: "verbe" },
  { phrase: "[Le] chien aboie.", classe: "déterminant" }, { phrase: "[Une] fleur pousse.", classe: "déterminant" },
  { phrase: "J'ai perdu [mon] stylo.", classe: "déterminant" }, { phrase: "[Ces] livres sont lourds.", classe: "déterminant" },
  { phrase: "Il mange [des] bonbons.", classe: "déterminant" }, { phrase: "[Cette] maison est grande.", classe: "déterminant" },
  { phrase: "[Les] oiseaux chantent.", classe: "déterminant" },
  { phrase: "Il porte un pull [rouge].", classe: "adjectif" }, { phrase: "C'est un [petit] chien.", classe: "adjectif" },
  { phrase: "La soupe est [chaude].", classe: "adjectif" }, { phrase: "Elle a une [jolie] robe.", classe: "adjectif" },
  { phrase: "Le ciel est [bleu].", classe: "adjectif" }, { phrase: "Nous avons un [grand] jardin.", classe: "adjectif" },
  { phrase: "Ce gâteau est [délicieux].", classe: "adjectif" },
  { phrase: "[Il] mange une pomme.", classe: "pronom" }, { phrase: "[Nous] allons au parc.", classe: "pronom" },
  { phrase: "[Elles] dansent bien.", classe: "pronom" }, { phrase: "Léa est là : [elle] lit.", classe: "pronom" },
  { phrase: "[Tu] chantes une chanson.", classe: "pronom" }, { phrase: "[Je] range ma chambre.", classe: "pronom" },
  { phrase: "Il court [vite].", classe: "adverbe" }, { phrase: "Elle chante [bien].", classe: "adverbe" },
  { phrase: "Nous partirons [demain].", classe: "adverbe" }, { phrase: "Le train roule [lentement].", classe: "adverbe" },
  { phrase: "Tu es [très] grand.", classe: "adverbe" }, { phrase: "Il pleut [souvent].", classe: "adverbe" },
  { phrase: "Le chat dort [sous] la table.", classe: "préposition" }, { phrase: "Il joue [avec] son frère.", classe: "préposition" },
  { phrase: "Le livre est [sur] le bureau.", classe: "préposition" }, { phrase: "Elle sort [sans] son manteau.", classe: "préposition" },
  { phrase: "Nous allons [chez] mamie.", classe: "préposition" },
  { phrase: "J'aime les pommes [et] les poires.", classe: "conjonction" }, { phrase: "Il veut sortir, [mais] il pleut.", classe: "conjonction" },
  { phrase: "Tu prends du thé [ou] du café ?", classe: "conjonction" }, { phrase: "Je mets mon manteau [car] il fait froid.", classe: "conjonction" },
  { phrase: "Il est malade, [donc] il reste au lit.", classe: "conjonction" },
];

/** Les classes que chaque classe nomme : les boîtes du CP, puis les classes du programme. */
const CLASSES_NOMMEES = (c: Classe): ClasseDeMot[] => {
  if (c === "CP") return ["nom", "verbe", "déterminant", "adjectif"];
  const ce1: ClasseDeMot[] = ["nom", "nom propre", "verbe", "déterminant", "adjectif", "pronom"];
  if (c === "CE1") return ce1;
  if (c === "CE2") return [...ce1, "adverbe"];
  return [...ce1, "adverbe", "préposition", "conjonction"];
};

/** Les classes qu'on confond le plus avec chacune. */
const VOISINES: Record<ClasseDeMot, ClasseDeMot[]> = {
  "nom": ["verbe", "adjectif", "nom propre", "déterminant"], "nom propre": ["nom", "pronom", "adjectif"], "verbe": ["nom", "adjectif", "adverbe"],
  "déterminant": ["pronom", "adjectif", "nom"], "adjectif": ["nom", "adverbe", "verbe"], "pronom": ["déterminant", "nom", "nom propre"],
  "adverbe": ["adjectif", "préposition", "verbe"], "préposition": ["adverbe", "conjonction", "déterminant"], "conjonction": ["préposition", "adverbe", "pronom"],
};

const CLASSE_MOT: TypeDeCarte = {
  id: "classeMot", nom: "La classe du mot souligné", domaine: "Étude de la langue", classes: classesDe("CP"), formats: ["pinces", "tache"],
  source: programmesFr(classesDe("CP")) + " : identifier les classes de mots — nom, verbe, déterminant, adjectif, pronom…",
  tirer(ctx) {
    const permises = CLASSES_NOMMEES(ctx.classe);
    const m = ctx.pioche(`classes:${ctx.classe}`, MOTS_EN_PHRASE.filter((x) => permises.includes(x.classe)));
    // Avant que les noms propres aient leur classe, un nom reste un nom.
    const libelle = (c: ClasseDeMot) => (c === "nom" && permises.includes("nom propre") ? "nom commun" : c);
    const p = ctx.format === "pinces" ? propositions(ctx.alea, libelle(m.classe), VOISINES[m.classe].filter((c) => permises.includes(c)).map(libelle)) : sansChoix;
    return {
      question: "Quelle est la classe du mot souligné ?", visuel: enGrand(souligne(m.phrase), "ct-phrase"), ...p,
      ligne: `C'est ${BLANC}`, reponse: libelle(m.classe), cle: m.phrase,
    };
  },
};

// ── Conjuguer ─────────────────────────────────────────────────────────────

interface Cadre { sujet: string; personne: number; verbe: string; suite: string }

/**
 * Des phrases qui vont à tous les temps — « Hier, Paul est allé au marché »,
 * « Demain, il ira au marché ». Aller et venir n'ont que des sujets
 * masculins : au passé composé, le participe s'accorde, et la banque des
 * formes ne connaît que le masculin.
 */
export const CADRES: Cadre[] = [
  { sujet: "Je", personne: 0, verbe: "chanter", suite: "une chanson." }, { sujet: "Tu", personne: 1, verbe: "jouer", suite: "au ballon." },
  { sujet: "Léo", personne: 2, verbe: "regarder", suite: "les nuages." }, { sujet: "Nous", personne: 3, verbe: "danser", suite: "dans la cour." },
  { sujet: "Vous", personne: 4, verbe: "dessiner", suite: "un château." }, { sujet: "Les enfants", personne: 5, verbe: "parler", suite: "à la maîtresse." },
  { sujet: "Ma sœur", personne: 2, verbe: "laver", suite: "la voiture." }, { sujet: "Mes amis", personne: 5, verbe: "marcher", suite: "dans la forêt." },
  { sujet: "Tu", personne: 1, verbe: "écouter", suite: "une histoire." }, { sujet: "Nous", personne: 3, verbe: "manger", suite: "à la cantine." },
  { sujet: "Vous", personne: 4, verbe: "ranger", suite: "vos affaires." }, { sujet: "Les élèves", personne: 5, verbe: "commencer", suite: "la leçon." },
  { sujet: "Il", personne: 2, verbe: "trouver", suite: "un trésor." }, { sujet: "Nous", personne: 3, verbe: "nager", suite: "dans la piscine." },
  { sujet: "Elles", personne: 5, verbe: "aimer", suite: "ce spectacle." },
  { sujet: "Tu", personne: 1, verbe: "être", suite: "en retard." }, { sujet: "Nous", personne: 3, verbe: "être", suite: "en classe." },
  { sujet: "Les chats", personne: 5, verbe: "être", suite: "dans le jardin." }, { sujet: "Je", personne: 0, verbe: "être", suite: "content." },
  { sujet: "Vous", personne: 4, verbe: "avoir", suite: "de la fièvre." }, { sujet: "Il", personne: 2, verbe: "avoir", suite: "faim." },
  { sujet: "Mes parents", personne: 5, verbe: "avoir", suite: "de la chance." }, { sujet: "Tu", personne: 1, verbe: "avoir", suite: "peur." },
  { sujet: "Nous", personne: 3, verbe: "faire", suite: "un gâteau." }, { sujet: "Vous", personne: 4, verbe: "faire", suite: "du vélo." },
  { sujet: "Paul", personne: 2, verbe: "aller", suite: "au marché." }, { sujet: "Ils", personne: 5, verbe: "aller", suite: "à la plage." },
  { sujet: "Léo", personne: 2, verbe: "venir", suite: "à la fête." }, { sujet: "Mes cousins", personne: 5, verbe: "venir", suite: "à la maison." },
  { sujet: "Les enfants", personne: 5, verbe: "prendre", suite: "le bus." }, { sujet: "Nous", personne: 3, verbe: "prendre", suite: "le train." },
  { sujet: "Vous", personne: 4, verbe: "dire", suite: "bonjour." }, { sujet: "Elle", personne: 2, verbe: "dire", suite: "la vérité." },
  { sujet: "Je", personne: 0, verbe: "vouloir", suite: "un chien." }, { sujet: "Tu", personne: 1, verbe: "voir", suite: "la mer." },
  { sujet: "Mes amis", personne: 5, verbe: "voir", suite: "un film." }, { sujet: "Il", personne: 2, verbe: "pouvoir", suite: "venir." },
  { sujet: "Nous", personne: 3, verbe: "vouloir", suite: "jouer." }, { sujet: "Les oiseaux", personne: 5, verbe: "pouvoir", suite: "voler." },
];

const MARQUEURS: Record<Temps, string> = { present: "Aujourd'hui", imparfait: "Autrefois", futur: "Demain", passeCompose: "Hier" };
/** Les personnes qu'on confond avec chacune : le même nombre, puis l'autre nombre. */
const PERSONNES_VOISINES = [[1, 2, 3], [0, 2, 4], [5, 0, 1], [4, 5, 2], [3, 5, 1], [2, 3, 4]];

/** Les verbes et les temps de la classe ; au cycle 3, ceux du CE2. */
const programmeDe = (c: Classe) => AU_PROGRAMME[auPlusCE2(c)];

const CONJUGAISON: TypeDeCarte = {
  id: "conjugaison", nom: "Conjuguer le verbe", domaine: "Étude de la langue", classes: classesDe("CP"), formats: ["pinces", "tache"],
  source: programmesFr(classesDe("CP")) + " : être, avoir, les verbes en -er, puis les verbes irréguliers du CE2",
  options: [{
    cle: "temps", libelle: "Le temps",
    valeurs: (c) => [["tous", "Les temps de la classe, mêlés"], ...programmeDe(c).temps.map((t): [string, string] => [t, tempsDe(t).nom])],
    defaut: () => "tous",
  }],
  tirer(ctx) {
    const prog = programmeDe(ctx.classe);
    const temps: Temps = prog.temps.includes(ctx.options.temps as Temps) ? ctx.options.temps as Temps : parmi(ctx.alea, prog.temps);
    const c = ctx.pioche(`cadres:${ctx.classe}`, CADRES.filter((x) => prog.verbes.includes(x.verbe)));
    const toutes = formes(c.verbe, temps);
    const forme = toutes[c.personne];
    // « J'ai chanté » : le pronom s'élide, la case ne peut pas le laisser seul.
    if (c.personne === 0 && /^[aeiouyéèêh]/i.test(forme)) return null;
    const commun = /^(le|la|les|l'|mon|ma|mes|un|une|des|je|tu|il|elle|nous|vous|ils|elles)\b/i.test(c.sujet);
    const sujet = commun ? c.sujet.charAt(0).toLowerCase() + c.sujet.slice(1) : c.sujet;
    const phrase = `${MARQUEURS[temps]}, ${texte(sujet)} ${BLANC} ${texte(c.suite)}`;
    const p = ctx.format === "pinces" ? propositions(ctx.alea, texte(forme), PERSONNES_VOISINES[c.personne].map((k) => texte(toutes[k]))) : sansChoix;
    return {
      question: `Conjugue le verbe ${c.verbe} ${tempsDe(temps).au}.`,
      visuel: `${enGrand(phrase, "ct-phrase")}<div class="ct-aide">(${texte(c.verbe)})</div>`, ...p, ligne: "",
      reponse: `${MARQUEURS[temps]}, ${texte(sujet)} <b>${texte(forme)}</b> ${texte(c.suite)}`, cle: `${c.sujet}:${c.verbe}:${temps}`,
    };
  },
};

// ── Le pronom ─────────────────────────────────────────────────────────────

/** Le groupe sujet et la phrase où un pronom le remplace. */
export const SUJETS: { phrase: string; pronom: string }[] = [
  ...SUJETS_A_REMPLACER,
  { phrase: "Le boulanger prépare le pain.", pronom: "Il prépare le pain." },
  { phrase: "Les filles chantent une chanson.", pronom: "Elles chantent une chanson." },
  { phrase: "Mon père et ma mère travaillent.", pronom: "Ils travaillent." },
  { phrase: "La voiture rouge démarre.", pronom: "Elle démarre." },
  { phrase: "Les oiseaux volent haut.", pronom: "Ils volent haut." },
  { phrase: "Ta sœur et toi jouez aux cartes.", pronom: "Vous jouez aux cartes." },
  { phrase: "Mes amies et moi allons au cinéma.", pronom: "Nous allons au cinéma." },
  { phrase: "Le petit chat noir dort.", pronom: "Il dort." },
  { phrase: "Les poules picorent du grain.", pronom: "Elles picorent du grain." },
  { phrase: "Paul et Marie se promènent.", pronom: "Ils se promènent." },
  { phrase: "Ma grand-mère tricote une écharpe.", pronom: "Elle tricote une écharpe." },
];

/** Le groupe sujet : ce que la phrase a de plus que la phrase au pronom. */
export function groupeSujet(phrase: string, avecPronom: string): { groupe: string; pronom: string } {
  const pronom = avecPronom.split(" ")[0].toLowerCase();
  const suite = avecPronom.slice(avecPronom.indexOf(" "));
  return { groupe: phrase.endsWith(suite) ? phrase.slice(0, phrase.length - suite.length) : phrase.split(" ")[0], pronom };
}

const PRONOMS_VOISINS: Record<string, string[]> = {
  il: ["elle", "ils", "elles"], elle: ["il", "elles", "ils"], ils: ["elles", "il", "nous"], elles: ["ils", "elle", "il"],
  nous: ["vous", "ils", "elles"], vous: ["nous", "ils", "elles"],
};

const PRONOM: TypeDeCarte = {
  id: "pronom", nom: "Remplacer le sujet par un pronom", domaine: "Étude de la langue", classes: classesDe("CE1"), formats: ["pinces", "tache"],
  source: programmesFr(classesDe("CE1")) + " : le groupe sujet et les pronoms personnels sujets",
  tirer(ctx) {
    const s = ctx.pioche("sujets", SUJETS);
    const { groupe, pronom } = groupeSujet(s.phrase, s.pronom);
    if (!PRONOMS_VOISINS[pronom]) return null;
    const visuel = enGrand(`<u><b>${texte(groupe)}</b></u>${texte(s.phrase.slice(groupe.length))}`, "ct-phrase");
    const p = ctx.format === "pinces" ? propositions(ctx.alea, pronom, PRONOMS_VOISINS[pronom]) : sansChoix;
    return { question: "Par quel pronom peut-on remplacer le groupe souligné ?", visuel, ...p, ligne: `${BLANC}`, reponse: texte(s.pronom), cle: s.phrase };
  },
};

// ── Les accents ───────────────────────────────────────────────────────────

const LETTRE_DE: Record<"aigu" | "grave" | "circonflexe", string> = { aigu: "é", grave: "è", circonflexe: "ê" };

/** Des mots dont l'accent est sur un e — ceux de la banque, et d'autres mots de l'école. */
export const MOTS_A_ACCENT: { mot: string; accent: "aigu" | "grave" | "circonflexe" }[] = [
  ...MOTS_ACCENTS.filter((m) => m.mot.includes(LETTRE_DE[m.accent])),
  ...["vélo", "fée", "épée", "cinéma", "éponge", "écureuil", "récréation"].map((mot) => ({ mot, accent: "aigu" as const })),
  ...["père", "règle", "pièce", "rivière", "sorcière", "zèbre"].map((mot) => ({ mot, accent: "grave" as const })),
  ...["bête", "fenêtre", "pêche", "rêve", "crêpe", "guêpe"].map((mot) => ({ mot, accent: "circonflexe" as const })),
];

const ACCENT: TypeDeCarte = {
  id: "accent", nom: "Quel accent ?", domaine: "Étude de la langue", classes: ["CE1", "CE2"], formats: ["pinces"],
  source: PROGRAMME_FR_C2 + " : les accents sur le e — é, è, ê",
  tirer(ctx) {
    const m = ctx.pioche("accents", MOTS_A_ACCENT);
    const l = LETTRE_DE[m.accent];
    const i = m.mot.indexOf(l);
    if (i < 0) return null;
    const visuel = enGrand(`${texte(m.mot.slice(0, i))}${BLANC_LETTRE}${texte(m.mot.slice(i + 1))}`, "ct-mot");
    return { question: "Quelle lettre manque-t-il ?", visuel, ...dansLOrdre(["é", "è", "ê"], l), reponse: texte(m.mot), cle: m.mot };
  },
};

// ── L'ordre alphabétique ──────────────────────────────────────────────────

const ORDRE = new Intl.Collator("fr", { sensitivity: "base" });
/** Des mots de tous les jours : ceux des sons, sans espace ni apostrophe. */
const MOTS_DU_DICTIONNAIRE = [...new Set(SONS.flatMap((s) => s.mots))].filter((m) => /^[a-zàâçéèêëîïôûùüÿœ]+$/.test(m));
const sansAccent = (t: string) => /^[a-z]+$/.test(t);

/** Trois mots que départage la lettre de rang `k` (0 : la première), les lettres d'avant étant les mêmes. */
export function troisMots(alea: () => number, k: number): string[] | null {
  const groupes = new Map<string, string[]>();
  for (const m of MOTS_DU_DICTIONNAIRE) {
    if (m.length <= k || !sansAccent(m.slice(0, k + 1))) continue;
    const tete = m.slice(0, k);
    groupes.set(tete, [...(groupes.get(tete) ?? []), m]);
  }
  const possibles = [...groupes.values()].filter((l) => new Set(l.map((m) => m[k])).size >= 3);
  if (!possibles.length) return null;
  const liste = melanger(alea, parmi(alea, possibles));
  const pris: string[] = [];
  for (const m of liste) if (!pris.some((x) => x[k] === m[k])) pris.push(m);
  return pris.length >= 3 ? pris.slice(0, 3) : null;
}

const ALPHABET: TypeDeCarte = {
  id: "alphabet", nom: "L'ordre alphabétique", domaine: "Étude de la langue", classes: classesDe("CE1"), formats: ["pinces", "tache"],
  source: programmesFr(classesDe("CE1")) + " : chercher un mot dans le dictionnaire, l'ordre alphabétique",
  tirer(ctx) {
    const k = ctx.classe === "CE1" ? 0 : ctx.classe === "CE2" ? 1 : 2;
    const mots = troisMots(ctx.alea, k);
    if (!mots) return null;
    const ranges = [...mots].sort(ORDRE.compare);
    if (ctx.format === "tache") {
      return {
        question: "Range ces mots dans l'ordre alphabétique.", visuel: enGrand(mots.map(texte).join(" · "), "ct-mot"), ...sansChoix,
        ligne: `${BLANC} — ${BLANC} — ${BLANC}`, reponse: ranges.map(texte).join(" — "), cle: ranges.join("|"),
      };
    }
    const p = propositions(ctx.alea, texte(ranges[0]), ranges.slice(1).map(texte));
    return {
      question: "Quel mot vient en premier dans le dictionnaire ?", visuel: enGrand("A → Z", "ct-consigne-grande"), ...p,
      reponse: texte(ranges[0]), cle: ranges.join("|"),
    };
  },
};

// ── Un, une, des ──────────────────────────────────────────────────────────

/** Des noms dont le genre et le nombre ne font pas de doute : pas de « souris », qui ne change pas au pluriel. */
export const NOMS_A_DETERMINER: [string, "un" | "une" | "des"][] = [
  ...GENRE_NOMBRE_CP.unUne.map(([nom, d]) => [nom, d as "un" | "une"] as [string, "un" | "une"]),
  ["ballon", "un"], ["livre", "un"], ["gâteau", "un"], ["cahier", "un"], ["bateau", "un"], ["crayon", "un"], ["oiseau", "un"], ["train", "un"], ["arbre", "un"],
  ["table", "une"], ["voiture", "une"], ["poule", "une"], ["robe", "une"], ["chaise", "une"], ["tortue", "une"], ["girafe", "une"], ["étoile", "une"], ["orange", "une"],
  ["chats", "des"], ["fleurs", "des"], ["pommes", "des"], ["ballons", "des"], ["livres", "des"], ["chevaux", "des"], ["gâteaux", "des"], ["oiseaux", "des"],
  ["jouets", "des"], ["bonbons", "des"], ["voitures", "des"], ["poules", "des"],
];

const DETERMINANT: TypeDeCarte = {
  id: "determinant", nom: "Un, une ou des ?", domaine: "Étude de la langue", classes: ["CP", "CE1"], formats: ["pinces"],
  source: PROGRAMME_FR_C2 + " : le genre et le nombre du nom, le déterminant qui le marque",
  tirer(ctx) {
    const [nom, d] = ctx.pioche("noms", NOMS_A_DETERMINER);
    return { question: "Quel mot va devant ?", visuel: enGrand(`${BLANC} ${texte(nom)}`, "ct-mot"), ...dansLOrdre(["un", "une", "des"], d), reponse: texte(`${d} ${nom}`), cle: nom };
  },
};

export const TYPES_FRANCAIS: TypeDeCarte[] = [SON, LETTRE, PONCTUATION, PHRASE, CLASSE_MOT, CONJUGAISON, PRONOM, ACCENT, ALPHABET, DETERMINANT];
