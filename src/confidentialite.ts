// Noms des élèves masqués avant tout envoi d'un texte libre à l'IA.
//
// Règle de l'application : aucune donnée nominative sur les élèves ne part
// vers un service extérieur. Un texte rédigé par l'enseignant en contient
// pourtant souvent (« Amandine a lu seule »). On remplace donc chaque nom
// connu par un marqueur neutre — [P1], [P2]… — et l'on remet les vrais noms
// dans la réponse, sur la machine.
//
// Un nom se reconnaît sans tenir compte des majuscules ni des accents :
// « amandine », « Ines » pour Inès. Masquer un mot de trop ne coûte rien —
// le mot d'origine revient à sa place au retour —, en laisser passer un
// laisse partir un prénom. Deux exceptions : les particules des noms de
// famille (« Le » de Le Gall) ne sont jamais masquées seules, et un prénom
// qui est aussi un mot courant (« rose », « petit ») ne l'est qu'avec sa
// majuscule.
//
// Un texte qui parle des élèves (portée « eleves ») part plus masqué encore
// (« on peut pas se débrouiller pour anonymiser mais que ça fonctionne quand
// même avec la ligne ? », l'enseignant, 2 novembre 2026). Tout ce qui désigne
// quelqu'un est remplacé, même ce que l'application ne connaît pas :
// - les personnes : un prénom courant (voir prenomsCourants.ts) et le nom qui
//   le suit, le nom après « son frère », « sa maman », « Mme », « Dr » ;
// - les lieux : l'établissement, une adresse, un code postal et sa ville,
//   le nom d'une école, d'un IME, d'un CMP, la ville où l'on habite ;
// - les dates précises et les années de naissance ;
// - les coordonnées et les numéros : téléphone, courriel, INE, sécurité sociale ;
// - un diagnostic rare, remplacé par sa catégorie (« [Santé 1 : un syndrome
//   génétique rare] ») : Mistral sait de quoi il retourne sans savoir de qui.
// Mistral répond avec les marqueurs, et tout revient à sa place sur la machine.
// Un texte de préparation de classe (portée « classe », par défaut) ne masque
// que les noms connus et les coordonnées : les personnages d'une histoire et
// les dates d'une leçon d'histoire y gardent leur sens.
//
// Pas de recherche en arrière (lookbehind) dans les expressions régulières :
// les webviews de macOS 11 ne la connaissent pas, et l'appel planterait.

import { PRENOMS } from "./prenomsCourants";

/** Ce qu'un marqueur remplace ; absent : un nom que l'application connaît (un élève, un adulte noté). */
export type Genre = "personne" | "lieu" | "date" | "contact" | "numero" | "sante";
export interface Remplacement { marqueur: string; original: string; genre?: Genre }

/** « eleves » : un texte qui parle des élèves, masqué de tout ce qui désigne quelqu'un ; « classe » : les noms connus et les coordonnées. */
export type Portee = "classe" | "eleves";
export interface OptionsMasque {
  portee?: Portee;
  /** L'établissement — son nom, son adresse — : masqué partout, quelle que soit la portée. */
  lieux?: string[];
  /** Ce que le masque a déjà repéré sur cet ordinateur (voir nomsAMasquer.ts) : reconnu à sa majuscule. */
  reperes?: { noms: string[]; lieux: string[] };
}

const LETTRE = /[\p{L}\p{N}]/u;

/** Le texte en minuscules sans accents, lettre pour lettre : les positions restent celles du texte. */
function plier(texte: string): string {
  let sortie = "";
  for (const c of texte) {
    const p = c === "’" ? "'" : c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("fr");
    sortie += p.length === c.length ? p : c;
  }
  return sortie;
}

/** Les particules des noms de famille : jamais masquées seules, le nom complet l'est. */
const PARTICULES = new Set([
  "le", "la", "les", "de", "du", "des", "van", "von", "der", "den", "ter", "el", "al", "ben", "bin", "da", "di", "do", "dos", "das",
  "mac", "mc", "saint", "sainte", "st", "ste", "et",
]);

/** Des prénoms ou des noms qui sont aussi des mots de tous les jours : masqués seulement avec leur majuscule. */
const MOTS_COURANTS = new Set([
  "rose", "pierre", "jade", "ambre", "olive", "prune", "violette", "capucine", "perle", "aurore", "constance", "clemence", "victoire",
  "blanche", "celeste", "flore", "fleur", "iris", "lilas", "myrtille", "marguerite", "camelia", "dahlia", "eglantine", "garance", "lys",
  "marine", "marin", "jean", "noel", "ange", "juste", "avril", "mai", "france", "aime", "desire", "modeste", "candide", "auguste", "sage",
  "olivier", "laurier", "martin", "petit", "petite", "grand", "grande", "blanc", "noir", "brun", "roux", "bonnet", "berger",
  "boucher", "boulanger", "chevalier", "meunier", "marchand", "fontaine", "riviere", "bois", "jardin", "moulin", "pont", "lac", "roche",
  "rocher", "champ", "prince", "roi", "comte", "duc", "pape", "renard", "lapin", "mouton", "loup", "poisson", "merle", "pinson", "pigeon",
  "faucon", "lion", "bon", "bonne", "joli", "doux", "gros", "court", "long",
]);

/**
 * Les formes sous lesquelles un élève peut être nommé : nom complet, chaque mot
 * qui n'est pas une particule, chaque partie d'un nom composé (« Zéphyrine » pour
 * Marie-Zéphyrine), le nom d'un seul tenant (« Legoff » pour Le Goff), sans
 * ligature (« Coelie » pour Cœlie).
 */
function formes(nom: string): string[] {
  const propre = nom.normalize("NFC").replace(/[\u2010\u2011]/g, "-").replace(/\s+/g, " ").trim();
  if (!propre) return [];
  const lettres = (m: string) => m.replace(/[^\p{L}]/gu, "");
  const mots = propre.split(" ").filter((m) => lettres(m).length >= 2 && !PARTICULES.has(plier(lettres(m))));
  const parties = propre.split(/[ -]/).filter((m) => lettres(m).length >= 3 && !PARTICULES.has(plier(lettres(m))));
  const dUnTenant = /[ -]/.test(propre) ? [propre.replace(/[ -]/g, "")] : [];
  const toutes = [propre, ...mots, ...parties, ...dUnTenant];
  const sansLigature = toutes.filter((f) => /[œæŒÆ]/.test(f))
    .map((f) => f.replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/Œ/g, "Oe").replace(/Æ/g, "Ae"));
  return [...new Set([...toutes, ...sansLigature])];
}

/**
 * Toutes les occurrences de `mot` en mot entier, sans tenir compte des
 * majuscules ni des accents — sauf pour un mot courant, qui doit porter sa
 * majuscule : « Rose » est une élève, « rose » une couleur. `avecMajuscule`
 * demande la même chose pour un autre mot. Un mot collé à un échappement (« \\n »
 * d'un texte en JSON) reste un mot entier : le « n » n'en fait pas partie.
 */
function occurrences(texte: string, mot: string, avecMajuscule = false): number[] {
  const res: number[] = [];
  const bas = plier(texte);
  const cible = plier(mot);
  const courant = avecMajuscule || (!cible.includes(" ") && MOTS_COURANTS.has(cible));
  let i = bas.indexOf(cible);
  while (i >= 0) {
    const avant = i > 0 ? texte[i - 1] : "";
    const echappe = i > 1 && texte[i - 2] === "\\" && "ntr".includes(avant);
    const apres = texte[i + cible.length] ?? "";
    const initiale = texte[i];
    const majuscule = initiale === initiale.toLocaleUpperCase("fr") && initiale !== initiale.toLocaleLowerCase("fr");
    // « cahierOndine », « Ondine2 » : le nom s'y lit, le mot auquel il est collé n'y change rien.
    const colle = majuscule && avant !== avant.toLocaleUpperCase("fr");
    if ((!LETTRE.test(avant) || echappe || colle) && !/\p{L}/u.test(apres) && (!courant || majuscule)) res.push(i);
    i = bas.indexOf(cible, i + 1);
  }
  return res;
}

/** Combien de fautes séparent deux mots : une lettre en moins, en trop, changée, ou deux lettres inversées. */
function fautes(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/**
 * Les mots du texte qui sont un nom connu mal écrit : une faute de frappe, une
 * dictée mal comprise. Ils partent masqués eux aussi, avec leur majuscule, à
 * une faute près, deux à partir de sept lettres. Un mot de trop ne coûte rien :
 * il revient à la restauration.
 */
function nomsMalEcrits(texte: string, variantes: string[]): string[] {
  const noms = variantes.map(plier).filter((v) => v.length >= 4 && !/[^\p{L}]/u.test(v) && !MOTS_COURANTS.has(v));
  const exacts = new Set(noms);
  const vus = new Map<string, boolean>();
  const sortie = new Set<string>();
  for (const m of texte.matchAll(/\p{Lu}\p{L}{3,}/gu)) {
    const i = m.index!;
    const avant = i > 0 ? texte[i - 1] : "";
    if (LETTRE.test(avant) && !(i > 1 && texte[i - 2] === "\\" && "ntr".includes(avant))) continue;
    const mot = m[0];
    const p = plier(mot);
    let proche = vus.get(p);
    if (proche === undefined) {
      proche = !exacts.has(p) && !PAS_DES_NOMS.has(p) && !MOTS_COURANTS.has(p) && noms.some((n) => {
        const permis = n.length >= 7 ? 2 : 1;
        return Math.abs(n.length - p.length) <= permis && fautes(n, p) <= permis;
      });
      vus.set(p, proche);
    }
    if (proche) sortie.add(mot);
  }
  return [...sortie];
}

/** Ce qui s'écrit avec une majuscule sans être le nom d'une personne : titres, fonctions, sigles. */
const PAS_DES_NOMS = new Set([
  "m", "mme", "mmes", "mlle", "madame", "monsieur", "mademoiselle", "docteur", "dr", "pr", "professeur", "maitre", "maitresse",
  "directeur", "directrice", "direction", "coordination", "chef", "service", "secretariat", "classe", "atelier", "bureau", "poste",
  "aesh", "atsem", "avs", "ulis", "ime", "sessad", "mdph", "cmp", "cmpp", "camsp", "ess", "pps", "pai", "pap", "ppre", "ppi", "erseh",
  "rased", "ien", "cpc", "cpd", "enseignant", "enseignante", "referent", "referente", "educateur", "educatrice", "psychologue",
  "orthophoniste", "psychomotricien", "psychomotricienne", "ergotherapeute", "infirmier", "infirmiere", "medecin", "maman", "papa",
  "mere", "pere", "famille", "parents", "parent", "grand", "grands", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
]);

/**
 * Les noms de personnes dans un texte libre — les contacts de l'établissement,
 * les participants d'une réunion : les mots à majuscule qui ne sont ni un
 * titre ni une fonction. Un mot de trop se masque sans dommage ; un nom oublié
 * partirait.
 */
export function nomsDansUnTexte(texte: string): string[] {
  const noms = new Set<string>();
  for (const mot of texte.normalize("NFC").match(/[\p{L}][\p{L}'’-]*/gu) ?? []) {
    const initiale = mot[0];
    const lettres = mot.replace(/[^\p{L}]/gu, "");
    if (lettres.length < 2 || initiale === initiale.toLocaleLowerCase("fr")) continue;
    if (PAS_DES_NOMS.has(plier(lettres))) continue;
    noms.add(mot.replace(/['’-]+$/u, ""));
  }
  return [...noms];
}

/** Remplace les noms des élèves par des marqueurs ; avec la portée « eleves », tout ce qui désigne quelqu'un. */
export function pseudonymiser(texte: string, noms: string[], options: OptionsMasque = {}): { texte: string; table: Remplacement[] } {
  const connus = [...new Set(noms.flatMap(formes))];
  // Les lettres accentuées en un seul caractère : les positions du texte plié sont celles du texte.
  let sortie = texte.normalize("NFC");
  const reperes = (options.reperes?.noms ?? []).flatMap(formes).filter((v) => {
    const p = plier(v);
    return p.replace(/[^\p{L}]/gu, "").length >= 3 && !connus.includes(v) && !PARTICULES.has(p) && !PAS_DES_NOMS.has(p) && !JAMAIS.has(p) && !MOTS_COURANTS.has(p);
  });
  // Un mot mal écrit ou déjà repéré n'est un nom qu'avec sa majuscule : « Sera » peut en être un, jamais « sera ».
  const aLaMajuscule = new Set([...nomsMalEcrits(sortie, connus), ...reperes]);
  const variantes = [...connus, ...aLaMajuscule].sort((a, b) => b.length - a.length);
  const table: Remplacement[] = [];
  const parOriginal = new Map<string, string>();
  for (const v of variantes) {
    const pos = occurrences(sortie, v, aLaMajuscule.has(v));
    if (!pos.length) continue;
    // De la fin vers le début : les positions restent valables pendant le remplacement.
    for (const p of pos.reverse()) {
      const original = sortie.slice(p, p + v.length);
      let marqueur = parOriginal.get(original);
      if (!marqueur) {
        marqueur = `[P${table.length + 1}]`;
        parOriginal.set(original, marqueur);
        table.push({ marqueur, original });
      }
      sortie = sortie.slice(0, p) + marqueur + sortie.slice(p + v.length);
    }
  }
  sortie = masquerLeReste(sortie, options, poseur(table), table);
  // Numérotation dans l'ordre de lecture, sorte par sorte : [P1] est le premier nom rencontré, [Lieu 1] le premier lieu.
  const ordre = new Map<string, string>();
  const vus: Record<string, number> = {};
  for (const m of sortie.match(MARQUEUR_POSE) ?? []) {
    if (ordre.has(m)) continue;
    const sorte = m.startsWith("[P") ? "P" : m.slice(1).split(" ")[0];
    const n = (vus[sorte] = (vus[sorte] ?? 0) + 1);
    ordre.set(m, sorte === "P" ? `[P${n}]` : m.replace(/^(\[\p{L}+ )\d+/u, `$1${n}`));
  }
  const SORTES = ["P", "Lieu", "Date", "Contact", "Numéro", "Santé"];
  const rang = (m: string) => {
    const sorte = m.startsWith("[P") ? "P" : m.slice(1).split(" ")[0];
    return SORTES.indexOf(sorte) * 10000 + Number(/\d+/.exec(m)?.[0] ?? 0);
  };
  return {
    texte: sortie.replace(MARQUEUR_POSE, (m) => ordre.get(m) ?? m),
    table: table.map((r) => ({ ...r, marqueur: ordre.get(r.marqueur) ?? r.marqueur }))
      .sort((x, y) => rang(x.marqueur) - rang(y.marqueur)),
  };
}

/**
 * Un court texte sans les noms connus, retirés pour de bon, et la ponctuation qui
 * les accompagnait : pour ce qui s'affiche ailleurs, sans retour possible, comme
 * une carte sur la tablette d'un élève. Les formes exactes seulement : une faute
 * supposée ferait sauter un vrai mot. Vide s'il ne disait que des noms.
 */
export function sansLesNoms(texte: string, noms: string[]): string {
  let sortie = texte.normalize("NFC");
  for (const v of [...new Set(noms.flatMap(formes))].sort((a, b) => b.length - a.length)) {
    for (const p of occurrences(sortie, v).reverse()) sortie = sortie.slice(0, p) + sortie.slice(p + v.length);
  }
  if (sortie === texte.normalize("NFC")) return sortie;
  return sortie
    .replace(/(^|[ \t])[dDlL]['’](?=[ \t,.;:!?]|$)/g, "$1")
    .replace(/([—–-])[ \t]*,/g, "$1")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[ \t,;:—–-]+|[ \t,;:—–-]+$/g, "");
}

/** Ce qui sépare les textes masqués ensemble : aucun nom ne le contient. */
const SEPARE = "\u0000";

/**
 * Masque plusieurs textes d'un seul tenant — les messages d'une conversation,
 * une question et son contexte : un même nom porte le même marqueur partout,
 * et la réponse se restaure avec une seule table.
 */
export function pseudonymiserTout(textes: string[], noms: string[], options: OptionsMasque = {}): { textes: string[]; table: Remplacement[] } {
  const { texte, table } = pseudonymiser(textes.join(SEPARE), noms, options);
  const parts = texte.split(SEPARE);
  return { textes: textes.map((t, i) => parts[i] ?? t), table };
}

/** La clé d'un marqueur, telle que Mistral peut le recopier : « [Lieu 1] », « [Lieu1] » ou « [Santé 1 : …] » donnent « Lieu 1 ». */
const cleDuMarqueur = (genre: string, n: string) => `${plier(genre).replace(/^num.*/, "numero").replace(/^sant.*/, "sante")} ${n}`;
const MARQUEUR_RENDU = /\[(?:P(\d+)|(Lieu|Date|Contact|Num[ée]ro|Sant[ée])\s?(\d+)(?:\s?:[^\]\n]*)?)\]/gu;

/** Remet les vrais noms, et tout ce qui avait été masqué. `absents` : les personnes disparues de la réponse. */
export function restaurer(texte: string, table: Remplacement[]): { texte: string; absents: string[] } {
  const personne = (r: Remplacement) => !r.genre || r.genre === "personne";
  const cle = (r: Remplacement) => {
    const m = /^\[(?:P(\d+)|(\p{L}+) (\d+)[^\]]*)\]$/u.exec(r.marqueur);
    return !m ? r.marqueur : m[1] ? `P ${m[1]}` : cleDuMarqueur(m[2], m[3]);
  };
  const parCle = new Map(table.map((r) => [cle(r), r.original]));
  const vus = new Set<string>();
  const sortie = texte.replace(MARQUEUR_RENDU, (m, p: string | undefined, genre: string | undefined, n: string | undefined) => {
    const k = p ? `P ${p}` : cleDuMarqueur(genre!, n!);
    const original = parCle.get(k);
    if (original === undefined) return m;
    vus.add(k);
    return original;
  });
  const absents = table.filter((r) => personne(r) && !vus.has(cle(r))).map((r) => r.original);
  return { texte: sortie, absents };
}

/**
 * Les marqueurs qui restent après la restauration — Mistral en invente
 * parfois, ou en déforme un —, dits en clair : un diagnostic devient sa
 * catégorie, un lieu « un lieu », une date « une date ».
 */
export function sansMarqueursRestants(texte: string): string {
  const EN_CLAIR: Record<string, string> = { lieu: "un lieu", date: "une date", contact: "des coordonnées", numero: "un numéro", sante: "un diagnostic" };
  return texte
    .replace(/\[(Lieu|Date|Contact|Num[ée]ro|Sant[ée])\s?\d+(?:\s?:\s?([^\]\n]*))?\]/gu,
      (_, genre: string, categorie: string | undefined) => categorie?.trim() || EN_CLAIR[plier(genre).replace(/^num.*/, "numero").replace(/^sant.*/, "sante")])
    .replace(/\[P\d+\]/g, "une personne");
}

// ── Ce qui désigne quelqu'un, au-delà des noms connus ─────────────────────

const LIBELLES: Record<Exclude<Genre, "personne">, string> = { lieu: "Lieu", date: "Date", contact: "Contact", numero: "Numéro", sante: "Santé" };

/** Le marqueur d'un passage : le même pour un même passage, numéroté par genre. */
type Poser = (original: string, genre: Genre, categorie?: string) => string;
function poseur(table: Remplacement[]): Poser {
  const deja = new Map<string, string>();
  const compte: Record<Genre, number> = { personne: table.length, lieu: 0, date: 0, contact: 0, numero: 0, sante: 0 };
  return (original, genre, categorie = "") => {
    const cle = `${genre}|${plier(original)}`;
    let marqueur = deja.get(cle);
    if (!marqueur) {
      const n = ++compte[genre];
      marqueur = genre === "personne" ? `[P${n}]` : `[${LIBELLES[genre]} ${n}${categorie ? ` : ${categorie}` : ""}]`;
      deja.set(cle, marqueur);
      table.push({ marqueur, original, genre });
    }
    return marqueur;
  };
}

/** Les marqueurs déjà posés : rien ne se cherche dedans. */
const MARQUEUR_POSE = /\[(?:P\d+|(?:Lieu|Date|Contact|Numéro|Santé) \d+[^\]]*)\]/gu;

/** Remplace des passages, de la fin vers le début ; un passage qui touche un marqueur posé reste tel quel. */
function remplacerPassages(texte: string, passages: { debut: number; fin: number; genre: Genre; categorie?: string }[], poser: Poser): string {
  const poses = [...texte.matchAll(MARQUEUR_POSE)].map((m) => [m.index!, m.index! + m[0].length] as const);
  const libres = passages
    .filter((p) => p.fin > p.debut && !poses.some(([a, b]) => p.debut < b && a < p.fin))
    .sort((a, b) => a.debut - b.debut || b.fin - a.fin);
  // Deux passages qui se chevauchent : le premier, le plus long, l'emporte.
  const gardes: typeof libres = [];
  for (const p of libres) if (!gardes.length || p.debut >= gardes[gardes.length - 1].fin) gardes.push(p);
  let sortie = texte;
  for (const p of gardes.reverse()) sortie = sortie.slice(0, p.debut) + poser(texte.slice(p.debut, p.fin), p.genre, p.categorie) + sortie.slice(p.fin);
  return sortie;
}

/** Les passages d'une expression : tout le passage trouvé, ou son dernier groupe — le nom après « son frère ». */
function passagesDe(texte: string, re: RegExp, genre: Genre, categorie?: (trouve: string) => string, groupe = 0) {
  const res: { debut: number; fin: number; genre: Genre; categorie?: string }[] = [];
  for (const m of texte.matchAll(re)) {
    const partie = m[groupe];
    if (!partie) continue;
    // Le groupe voulu finit le passage : sa place se lit depuis la fin.
    const debut = groupe ? m.index! + m[0].length - partie.length : m.index!;
    res.push({ debut, fin: debut + partie.length, genre, categorie: categorie?.(partie) });
  }
  return res;
}

/** Une expression qui ne tient pas compte des majuscules pour ces mots-là seulement : le nom qui suit doit garder la sienne. */
const sansCasse = (mots: string) => mots.replace(/\p{L}/gu, (c) => {
  const [b, h] = [c.toLocaleLowerCase("fr"), c.toLocaleUpperCase("fr")];
  return b === h ? c : `[${b}${h}]`;
});

const MAJ = "A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸÆŒ";
/** Un mot à majuscule — « Durand », « Le », « DUPONT », « Marie-Lou ». */
const MOT_MAJ = `[${MAJ}][\\p{L}'’]*(?:-[\\p{L}'’]+)*`;
/** Un nom de personne ou de lieu : un à trois mots à majuscule, avec leurs particules (« de La Tour », « Le Gall »). */
const NOM = `${MOT_MAJ}(?:[ \\t]+(?:(?:de|du|des|la|le|van|von|da|di|dos|ben|el|al)[ \\t]+|d['’])?${MOT_MAJ}){0,2}`;

/** Les liens de parenté et les fonctions après lesquels vient un nom : « son frère Kaïs », « l'orthophoniste, Mme Roy ». */
const LIENS = sansCasse([
  "demi-frère", "demi-sœur", "demi-soeur", "grand-mère", "grand-mere", "grand-père", "grand-pere", "beau-père", "beau-pere", "belle-mère",
  "belle-mere", "frère", "frere", "sœur", "soeur", "mère", "mere", "père", "pere", "maman", "papa", "mamie", "mamy", "papi", "papy", "cousine",
  "cousin", "oncle", "tante", "tonton", "tata", "copain", "copine", "amie", "ami", "voisine", "voisin", "nounou", "parrain", "marraine", "fils",
  "fille", "neveu", "nièce", "niece", "jumelle", "jumeau", "camarade", "aesh", "avs", "éducatrice", "educatrice", "éducateur", "educateur",
  "orthophoniste", "psychologue", "psychomotricienne", "psychomotricien", "ergothérapeute", "ergotherapeute", "médecin", "medecin",
  "neuropédiatre", "neuropediatre", "pédopsychiatre", "pedopsychiatre", "pédiatre", "pediatre", "infirmière", "infirmiere", "infirmier",
  "référente", "referente", "référent", "referent", "maîtresse", "maitresse", "enseignante", "enseignant", "directrice", "directeur",
  "assistante sociale", "assistant social", "chauffeur", "chauffeuse", "s['’]appelle", "appelée", "appelee", "appelé", "appele", "prénommée", "prenommee",
  "prénommé", "prenomme", "surnommée", "surnommee", "surnommé", "surnomme",
].join("|"));
const TITRES = `M\\.?|MM\\.?|${sansCasse("mr|mme|mmes|mlle|mlles")}\\.?|Me|${sansCasse("dr|pr")}\\.?|${sansCasse("monsieur|madame|mademoiselle|docteur|professeur|maître|maitre")}`;
const APRES_UN_LIEN = new RegExp(`(?:^|[^\\p{L}])(?:${LIENS})[ \\t]*[,:]?[ \\t]+(${NOM})`, "gu");
const APRES_UN_TITRE = new RegExp(`(?:^|[^\\p{L}])(?:${TITRES})[ \\t]+(${NOM})`, "gu");
/** Un titre abrégé, un nom noté à la va-vite : « mme roussel ». Pas ce qui se conjugue : « Mme est venue ». */
const APRES_UN_TITRE_ABREGE = new RegExp(`(?:^|[^\\p{L}])${sansCasse("(?:mr|mme|mlle|dr)")}\\.?[ \\t]+(?!(?:est|sera|était|etait|a|ont|vont|va|qui|que|dit|pense|nous|vous|les|des|une|pour|dans|avec)[^\\p{L}])(\\p{Ll}[\\p{L}'’-]{2,})`, "gu");

/** Un établissement, un service : le nom qui le suit est un lieu (« l'IME Les Tilleuls », « le CMP de Sarcelles »). */
const STRUCTURES = new RegExp(`(?:^|[^\\p{L}])(?:${sansCasse("école|ecole|collège|college|lycée|lycee|crèche|creche|hôpital|hopital|clinique|foyer|institut|centre|groupe scolaire")}|IME|IMPro|IEM|SESSAD|ITEP|DITEP|CMPP|CMP|CAMSP|SAMSAH|ULIS|SEGPA|UEMA|UEEA|CHRU|CHU|CH|MAS|FAM|CRA|EEAP|EHPAD|ESAT)`
  + `(?:[ \\t]+(?:maternelle|élémentaire|elementaire|primaire|publique|privée|privee|spécialisée?|specialisee?|médico-éducatif|medico-educatif))?`
  + `[ \\t]+(?:(?:de|du|des|la|le|les)[ \\t]+|d['’])?(${NOM})`, "gu");
/** Où l'on habite, d'où l'on vient : le nom qui suit est un lieu (« il habite à Sarcelles », « née à Lyon »). */
/** Le lieu de naissance, même après la date : « né le 12 mars 2017 à Sarcelles ». */
const NE_A = new RegExp(`(?:^|[^\\p{L}])${sansCasse("née?s?")}[^.\\n\\u0000]{0,40}?[ \\t]+(?:à|a|au|en)[ \\t]+(${NOM})`, "gu");
const DEMEURES = new RegExp(`(?:^|[^\\p{L}])${sansCasse("(?:habite|habitait|habitent|vit|vivait|vivent|réside|reside|résidait|residait|domiciliée?s?|née?s?|déménagée?s?|demenagee?s?|déménager|demenager|déménage|demenage|hospitalisée?s?|hospitalisee?s?|opérée?s?|operee?s?|soignée?s?|soignee?s?|originaire|scolarisée?s?|scolarisee?s?|vient|venait|arrivée?s?|arrive)")}`
  + `[ \\t]+(?:à|a|au|aux|en|de|du|d['’]|dans|sur)[ \\t]*(${NOM})`, "gu");

const MOIS = "janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre";
const DATES = [
  /\b\d{1,2}[/.-]\d{1,2}[/.-](?:\d{4}|\d{2})\b/gu,
  /\b\d{4}-\d{2}-\d{2}\b/gu,
  new RegExp(`\\b(?:1er|\\d{1,2})[ \\t]+(?:${sansCasse(MOIS)})(?:[ \\t]+\\d{4})?\\b`, "gu"),
  // Le jour et le mois : « le 12/03 » — seulement après « le » : 12/20 est une note, 3/4 une fraction.
  /\b[lL]e[ \t]+\d{1,2}\/\d{1,2}\b(?![/.-]\d)/gu,
  // En toutes lettres, comme le dit une dictée : « le trois mars ».
  new RegExp(`\\b${sansCasse("(?:premier|deux|trois|quatre|cinq|six|sept|huit|neuf|dix(?:[- ](?:sept|huit|neuf))?|onze|douze|treize|quatorze|quinze|seize|vingt(?:[- ](?:et[- ]un|deux|trois|quatre|cinq|six|sept|huit|neuf))?|trente(?:[- ]et[- ]un)?)")}[ \\t]+(?:${sansCasse(MOIS)})\\b`, "gu"),
];
/** L'année de naissance, et son mois : « né en 2017 », « née en mars 2017 ». */
const NAISSANCE = new RegExp(`${sansCasse("(?:née?s?|naissance)")}[ \\t]+(?:en|:)?[ \\t]*((?:(?:${sansCasse(MOIS)})[ \\t]+)?\\d{4})\\b`, "gu");

/** Une adresse : le numéro, la voie, et son nom à majuscules, particules comprises (« 12 bis, rue du Général de Gaulle »). */
const PARTICULE_DE_RUE = `(?:(?:de|du|des|la|le|les)[ \\t]+|[dl]['’])*`;
const ADRESSE = new RegExp(`\\b\\d{1,4}[ \\t]?(?:bis|ter)?,?[ \\t]+(?:${sansCasse("rue|avenue|av\\.|boulevard|bd|chemin|allée|allee|impasse|place|route|quai|cours|square|résidence|residence|lotissement|lieu-dit|hameau|voie|sentier|passage|cité|cite")})`
  + `[ \\t]+${PARTICULE_DE_RUE}${MOT_MAJ}(?:[ \\t-]+${PARTICULE_DE_RUE}${MOT_MAJ}){0,4}`, "gu");
/** Une adresse notée à la va-vite, sans majuscule : « 12 rue des lilas ». Les seules voies qui ne sont pas aussi des mots du jour (« 3 cours de français »). */
const ADRESSE_MINUSCULE = new RegExp(`\\b\\d{1,4}[ \\t]?(?:bis|ter)?,?[ \\t]+(?:${sansCasse("rue|avenue|boulevard|allée|allee|impasse|chemin|square")})[ \\t]+${PARTICULE_DE_RUE}\\p{L}[\\p{L}'’-]+`, "gu");
const CODE_POSTAL = new RegExp(`\\b\\d{5}[ \\t]+${MOT_MAJ}(?:[ \\t-]+${MOT_MAJ}){0,3}(?:[ \\t]+${sansCasse("cedex")})?`, "gu");

/** Un code postal seul : « 95200 ». */
const CODE_POSTAL_SEUL = /\b\d{5}\b/gu;

const COURRIEL = /[\p{L}\d._%+-]+@[\p{L}\d.-]+\.\p{L}{2,}/gu;
const TELEPHONE = /(?:(?:\+33|0033)[ \t.-]?(?:\(0\)[ \t.-]?)?|\b0[ \t.-]?)[1-9](?:[ \t.-]?\d{2}){4}\b/gu;
/** L'INE (dix chiffres et une lettre, ou neuf et deux), le numéro de sécurité sociale, et tout long nombre. */
const NUMEROS = [
  /\b\d{3}[ \t]?\d{3}[ \t]?\d{3}[ \t]?[A-Za-z]{2}\b|\b\d{3}[ \t]?\d{3}[ \t]?\d{4}[ \t]?[A-Za-z]\b/gu,
  /\b[12][ \t]?\d{2}[ \t]?\d{2}[ \t]?(?:\d{2}|2[AB])[ \t]?\d{3}[ \t]?\d{3}(?:[ \t]?\d{2})?\b/gu,
  /\b\d{8,}\b/gu,
];

/** Les diagnostics rares : leur catégorie suffit à Mistral, le nom précis désignerait l'enfant. */
const SANTE: { re: RegExp; categorie: string; groupe?: number }[] = [
  // Des noms qui ne désignent rien d'autre : avec ou sans « syndrome de », avec ou sans majuscule. Le groupe, parce que « Rett » n'est pas dans « Barrett ».
  { re: new RegExp(`(?:^|[^\\p{L}])((?:${sansCasse("(?:syndrome|maladie|myopathie)")}[ \\t]+(?:de[ \\t]+|d['’][ \\t]*|du[ \\t]+)?)?${sansCasse("(?:rett|angelman|prader[- ]willi|noonan|smith[- ]magenis|cornelia de lange|duchenne|phelan[- ]mcdermid)")})(?![\\p{L}])`, "gu"), categorie: "un syndrome génétique rare", groupe: 1 },
  { re: new RegExp(`${sansCasse("trisomie")}[ \\t]*(?:13|18)\\b`, "gu"), categorie: "une anomalie chromosomique rare" },
  { re: new RegExp(`(?:${sansCasse("syndrome")}[ \\t]+(?:de[ \\t]+|d['’][ \\t]*|du[ \\t]+)?|${sansCasse("maladie")}[ \\t]+(?:de[ \\t]+|d['’][ \\t]*)?)?(?:X[ \\t-]?${sansCasse("fragile")})`, "gu"), categorie: "une maladie génétique rare" },
  { re: new RegExp(`(?:${sansCasse("microdélétion|microdeletion|délétion|deletion|duplication|translocation|microduplication")})[ \\t]+(?:\\d{1,2}|X|Y)[pq]?[\\d.]*(?:[ \\t]?[pq][\\d.]+)?`, "gu"), categorie: "une anomalie chromosomique rare" },
  { re: /\b\d{1,2}[pq]\d{1,2}(?:\.\d+)?\b/gu, categorie: "une anomalie chromosomique rare" },
  { re: new RegExp(`${sansCasse("syndrome")}[ \\t]+(?:de[ \\t]+|d['’][ \\t]*|du[ \\t]+)?(?:West|Dravet|Lennox(?:[ -]Gastaut)?|Landau[ -]Kleffner|Doose|Ohtahara|Jeavons)\\b`, "gu"), categorie: "une épilepsie rare" },
  { re: new RegExp(`${sansCasse("syndrome")}[ \\t]+(?:de[ \\t]+|d['’][ \\t]*|du[ \\t]+)?(?!Asperger\\b|Down\\b|Gilles\\b|Tourette\\b)${MOT_MAJ}(?:[ \\t]*[- ][ \\t]*(?:de[ \\t]+)?${MOT_MAJ}){0,3}`, "gu"), categorie: "un syndrome génétique rare" },
  { re: new RegExp(`${sansCasse("maladie")}[ \\t]+(?:de[ \\t]+|d['’][ \\t]*)(?!Lyme\\b|Crohn\\b|Alzheimer\\b|Parkinson\\b)${MOT_MAJ}(?:[ \\t]*[- ][ \\t]*${MOT_MAJ}){0,3}`, "gu"), categorie: "une maladie rare" },
  { re: new RegExp(`${sansCasse("leucodystrophie|adrénoleucodystrophie|adrenoleucodystrophie|sclérose tubéreuse|sclerose tubereuse|neurofibromatose|mucopolysaccharidose|phénylcétonurie|phenylcetonurie|ostéogenèse imparfaite|osteogenese imparfaite|achondroplasie|amyotrophie spinale|myopathie|drépanocytose|drepanocytose|mucoviscidose|ataxie de friedreich|syndrome d'alcoolisation fœtale|syndrome d’alcoolisation fœtale")}`, "gu"), categorie: "une maladie rare" },
];

/** Ce qui ne désigne jamais une personne, même avec une majuscule : les mois, les jours, les fêtes. */
const JAMAIS = new Set([
  "janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre", "lundi", "mardi",
  "mercredi", "jeudi", "vendredi", "samedi", "dimanche", "noel", "paques", "toussaint", "france", "dieu",
]);
/** Des prénoms qui sont aussi des mots de tous les jours : écrits en minuscules, ce sont ces mots-là. */
const MOTS_EN_MINUSCULES = new Set([
  ...MOTS_COURANTS, "max", "maxime", "sam", "marc", "serge", "martial", "constant", "clement", "romain", "aimee", "eden", "ocean", "colombe",
  "loup", "victoire", "constance", "clemence", "gloria", "lune", "rosa", "come", "ella", "elle", "lou", "mila", "nina", "lina", "lia", "noa", "mia",
]);

/** Le mot est-il un prénom ? Avec sa majuscule, s'il est dans la liste ; en minuscules, seulement s'il n'est pas aussi un mot courant. */
function estUnPrenom(mot: string): boolean {
  const plie = plier(mot);
  if (JAMAIS.has(plie)) return false;
  const parties = plie.split("-").filter((p) => p.length >= 2);
  if (!PRENOMS.has(plie) && !(parties.length > 1 && parties.some((p) => PRENOMS.has(p)))) return false;
  const initiale = mot[0];
  const majuscule = initiale !== initiale.toLocaleLowerCase("fr");
  return majuscule || !MOTS_EN_MINUSCULES.has(plie);
}

/** Le mot qui suit un prénom fait-il partie du nom ? Un mot à majuscule qui n'est ni un titre, ni un mois, ni un sigle (« CE1 », « IME »). */
function suitLeNom(mot: string, apres: string): boolean {
  const initiale = mot[0];
  if (initiale === initiale.toLocaleLowerCase("fr") || /\d/.test(apres)) return false;
  const lettres = mot.replace(/[^\p{L}]/gu, "");
  if (lettres.length <= 4 && lettres === lettres.toLocaleUpperCase("fr")) return false;
  const plie = plier(lettres);
  return plie.length >= 2 && !PAS_DES_NOMS.has(plie) && !JAMAIS.has(plie);
}

/** Les particules d'un nom de famille, entre le prénom et le nom : « Noé de Souza », « Lina Van Damme ». Pas « et » : « Lucas et Emma » sont deux. */
const PARTICULES_DU_NOM = new Set(["de", "du", "des", "le", "la", "van", "von", "der", "den", "ter", "da", "di", "dos", "das", "ben", "bin", "el", "al"]);

/** Les prénoms que l'application ne connaît pas, et le nom de famille qui les suit : « Kylian », « Lina Benali », « Noé de Souza ». */
function prenomsInconnus(texte: string): { debut: number; fin: number; genre: Genre }[] {
  const mots = [...texte.matchAll(/[\p{L}][\p{L}'’-]*/gu)].map((m) => ({ i: m.index!, mot: m[0].replace(/['’-]+$/u, "") }));
  const res: { debut: number; fin: number; genre: Genre }[] = [];
  for (let k = 0; k < mots.length; k++) {
    let { i: debut, mot } = mots[k];
    // L'élision : « d'Emma », « l'Inès », « qu'Ali ».
    const elide = /^((?:[dljmnstc]|qu|lorsqu|puisqu|quoiqu|jusqu)['’])(.+)$/iu.exec(mot);
    if (elide) { debut += elide[1].length; mot = elide[2]; }
    if (!estUnPrenom(mot)) continue;
    let fin = debut + mot.length;
    // Le nom de famille en capitales, devant : « BERTHELOT Ombeline ».
    const devant = mots[k - 1];
    if (devant && /^[ \t]+$/.test(texte.slice(devant.i + devant.mot.length, debut)) && devant.mot === devant.mot.toLocaleUpperCase("fr") && suitLeNom(devant.mot, " ")) debut = devant.i;
    // Le nom qui suit, séparé par des espaces seulement : deux mots au plus, avec sa particule.
    let j = k + 1;
    for (let ajoutes = 0; j < mots.length && ajoutes < 2; ajoutes++) {
      if (!/^[ \t]+$/.test(texte.slice(fin, mots[j].i))) break;
      const particule = PARTICULES_DU_NOM.has(plier(mots[j].mot)) && mots[j].mot[0] === mots[j].mot[0].toLocaleLowerCase("fr");
      const suivant = particule ? mots[j + 1] : mots[j];
      if (!suivant || (particule && !/^[ \t]+$/.test(texte.slice(mots[j].i + mots[j].mot.length, suivant.i)))) break;
      if (!suitLeNom(suivant.mot, texte.charAt(suivant.i + suivant.mot.length))) break;
      fin = suivant.i + suivant.mot.length;
      j += particule ? 2 : 1;
    }
    res.push({ debut, fin, genre: "personne" });
    k = j - 1;
  }
  return res;
}

/** Ce qui suit un prénom sans être un nom, même écrit avec une majuscule : « Amandine Et Léo ». */
const PAS_UN_NOM_DE_FAMILLE = new Set([
  "et", "ou", "mais", "donc", "or", "ni", "car", "elle", "il", "on", "nous", "vous", "ils", "elles", "je", "tu", "le", "la", "les", "un", "une", "des", "du", "de", "au", "aux",
  "ce", "cet", "cette", "ces", "son", "sa", "ses", "mon", "ma", "mes", "qui", "que", "quand", "puis", "alors", "avec", "sans", "pour", "dans", "sur", "sous", "est", "a", "va",
  "fait", "lit", "bien", "tres",
]);

/**
 * Le nom de famille collé à un prénom connu : « Amandine Dupont » ou « DUPONT
 * Amandine » partaient en « [P1] Dupont » et « DUPONT [P1] », le prénom seul masqué.
 */
function nomsAutourDesMarqueurs(texte: string): { debut: number; fin: number; genre: Genre }[] {
  const res: { debut: number; fin: number; genre: Genre }[] = [];
  for (const m of texte.matchAll(new RegExp(`\\[P\\d+\\][ \\t]+(${MOT_MAJ})`, "gu"))) {
    if (PAS_UN_NOM_DE_FAMILLE.has(plier(m[1])) || !suitLeNom(m[1], texte.charAt(m.index! + m[0].length))) continue;
    const debut = m.index! + m[0].length - m[1].length;
    res.push({ debut, fin: debut + m[1].length, genre: "personne" });
  }
  for (const m of texte.matchAll(new RegExp(`([${MAJ}][${MAJ}'’-]{2,})[ \\t]+\\[P\\d+\\]`, "gu"))) {
    if (LETTRE.test(texte.charAt(m.index! - 1)) || !suitLeNom(m[1], " ")) continue;
    res.push({ debut: m.index!, fin: m.index! + m[1].length, genre: "personne" });
  }
  return res;
}

/** Ce qui, dans le nom d'un lieu, ne désigne aucun endroit en particulier. */
const MOTS_DES_LIEUX = new Set([
  "ecole", "institut", "centre", "college", "lycee", "avenue", "boulevard", "route", "place", "allee", "chemin", "impasse", "residence", "saint", "sainte",
  "medico", "educatif", "educative", "primaire", "maternelle", "elementaire", "groupe", "scolaire", "cedex", "foyer", "maison", "france", "quartier", "hameau", "square",
]);

/**
 * Les lieux de l'établissement, et chacune de leurs parties : « 12 rue des Lilas,
 * 95200 Sarcelles » se masque aussi par morceaux. Sur les élèves, ses noms propres
 * aussi : « sortie à Sarcelles », « aux Tilleuls ».
 */
function lieuxConnus(texte: string, lieux: string[], eleves: boolean, reperes: string[]): { debut: number; fin: number; genre: Genre }[] {
  const parties = [...new Set(lieux.flatMap((l) => [l, ...l.split(/[\n,;]+/)]).map((l) => l.trim().replace(/\s+/g, " ")).filter((l) => l.replace(/[^\p{L}\d]/gu, "").length >= 4))]
    .sort((a, b) => b.length - a.length);
  const entiers = parties.flatMap((l) => occurrences(texte, l).map((debut) => ({ debut, fin: debut + l.length, genre: "lieu" as Genre })));
  if (!eleves) return entiers;
  const propres = [...new Set([...lieux, ...reperes].flatMap((l) => l.normalize("NFC").match(/\p{Lu}[\p{L}'’-]{3,}/gu) ?? []))]
    .filter((m) => { const p = plier(m); return !MOTS_DES_LIEUX.has(p) && !PAS_DES_NOMS.has(p) && !JAMAIS.has(p); });
  return [...entiers, ...propres.flatMap((m) => occurrences(texte, m, true).map((debut) => ({ debut, fin: debut + m.length, genre: "lieu" as Genre })))];
}

/** Tout ce qui reste à masquer, détecteur après détecteur : chacun voit les marqueurs posés par les précédents. */
function masquerLeReste(texte: string, options: OptionsMasque, poser: Poser, table: Remplacement[]): string {
  const eleves = options.portee === "eleves";
  let t = texte;
  const etape = (passages: { debut: number; fin: number; genre: Genre; categorie?: string }[]) => { t = remplacerPassages(t, passages, poser); };
  etape(lieuxConnus(t, options.lieux ?? [], eleves, options.reperes?.lieux ?? []));
  etape([...passagesDe(t, COURRIEL, "contact"), ...passagesDe(t, TELEPHONE, "contact")]);
  if (eleves) etape(SANTE.flatMap((s) => passagesDe(t, s.re, "sante", () => s.categorie, s.groupe)));
  etape(NUMEROS.flatMap((re) => passagesDe(t, re, "numero")));
  if (!eleves) return t;
  etape([...DATES.flatMap((re) => passagesDe(t, re, "date")), ...passagesDe(t, NAISSANCE, "date", undefined, 1)]);
  etape([...passagesDe(t, ADRESSE, "lieu"), ...passagesDe(t, ADRESSE_MINUSCULE, "lieu"), ...passagesDe(t, CODE_POSTAL, "lieu")]);
  etape(passagesDe(t, CODE_POSTAL_SEUL, "lieu"));
  etape([...passagesDe(t, STRUCTURES, "lieu", undefined, 1), ...passagesDe(t, DEMEURES, "lieu", undefined, 1), ...passagesDe(t, NE_A, "lieu", undefined, 1)]);
  etape([...passagesDe(t, APRES_UN_LIEN, "personne", undefined, 1), ...passagesDe(t, APRES_UN_TITRE, "personne", undefined, 1), ...passagesDe(t, APRES_UN_TITRE_ABREGE, "personne", undefined, 1)]);
  etape(prenomsInconnus(t));
  etape(nomsAutourDesMarqueurs(t));
  return partoutAilleurs(t, table);
}

/**
 * Un nom repéré une fois l'est partout : « Mme Benali » plus haut, « Benali »
 * plus bas ; « 95200 Sarcelles » dans l'adresse, « Sarcelles » dans la phrase.
 * Chaque reprise porte le marqueur du nom entier.
 */
function partoutAilleurs(texte: string, table: Remplacement[]): string {
  const formesDe = (r: Remplacement): string[] => {
    if (r.genre === "lieu") return [r.original, r.original.replace(/^\d{5}[ \t]+/, "")];
    if (r.genre !== "personne") return [];
    const mots = r.original.split(/[ \t]+/).filter((m) => {
      const plie = plier(m.replace(/[^\p{L}]/gu, ""));
      return plie.length >= 3 && !PARTICULES.has(plie) && !PAS_DES_NOMS.has(plie) && !JAMAIS.has(plie);
    });
    return [r.original, ...mots];
  };
  const reprises = table.flatMap((r) => formesDe(r).map((forme) => ({ forme: forme.trim(), marqueur: r.marqueur })))
    .filter((x) => x.forme.replace(/[^\p{L}]/gu, "").length >= 3)
    .sort((a, b) => b.forme.length - a.forme.length);
  let t = texte;
  for (const { forme, marqueur } of reprises) {
    const poses = [...t.matchAll(MARQUEUR_POSE)].map((m) => [m.index!, m.index! + m[0].length] as const);
    const libres = occurrences(t, forme).filter((p) => !poses.some(([a, b]) => p < b && a < p + forme.length));
    for (const p of libres.reverse()) t = t.slice(0, p) + marqueur + t.slice(p + forme.length);
  }
  return t;
}
