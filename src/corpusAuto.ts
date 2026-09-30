// ── Le corpus se prépare tout seul ────────────────────────────────────────
//
// Les mots viennent de la banque ARASAAC installée sur cet ordinateur : ils
// ont une image, et rien ne part sur le réseau. On devine les thèmes du
// projet de deux façons — par le libellé des catégories (« Les animaux »
// mène aux animaux terrestres) et par les pictogrammes qui portent les mots
// du titre (« soupe » est rangée dans les aliments) —, et l'on y pioche.
// Faute de thème, on garde les pictogrammes qui portent ces mots-là ; faute
// de tout, l'IA propose. Les phrases, elles, viennent de l'IA, écrites avec
// ces mots. L'enseignant change tout : les thèmes, le tirage, les phrases,
// ou les mots à la main.

import type { CategorieArasaac, ChatMessage } from "./api";
import { normaliser } from "./competencesTravaillees";
import { pseudonymiser } from "./confidentialite";
import { corpusDeLaReponse, promptCorpus, type DemandeCorpus, type ProjetDecrit } from "./corpusIa";
import type { Corpus } from "./corpusProjet";
import { CATEGORIES_FR, libelleCategorie } from "./data/categoriesArasaac";
import { hasard, piocher } from "./hasard";
import { uneImageParMot } from "./loto";

// ── Deviner les thèmes ────────────────────────────────────────────────────

/** Les catégories qui ne font pas un thème : la grammaire, le vocabulaire noyau, le fourre-tout. */
const HORS_THEME = new Set([
  "verb", "usual verbs", "qualifying adjective", "numeral adjective", "ordinal adjective", "personal pronoun", "pronoun",
  "preposition", "adverb of time", "polite set expression", "miscellaneous", "universal decimal classification",
  "multimedia buttons", "categorization", "basic concepts", "object", "orthographic sign",
]);

/** Un thème où piocher : une catégorie connue, qui n'est ni grammaire ni fourre-tout. */
export const estUnTheme = (nom: string) => nom in CATEGORIES_FR && !HORS_THEME.has(nom) && !nom.startsWith("core vocabulary");

/** Les catégories assez fournies pour faire un thème, par libellé. */
export function themesProposables(categories: CategorieArasaac[]): CategorieArasaac[] {
  return categories.filter((c) => estUnTheme(c.nom) && c.nombre >= 6)
    .sort((a, b) => libelleCategorie(a.nom).localeCompare(libelleCategorie(b.nom), "fr"));
}

/** Les mots qui ne disent rien du thème : les mots outils, et ceux de tous les projets. */
const VIDES = new Set([
  "les", "des", "une", "pour", "avec", "dans", "sur", "sous", "chez", "que", "qui", "quoi", "dont", "nos", "vos", "ses", "leur",
  "leurs", "tout", "tous", "toute", "toutes", "chaque", "autre", "autres", "plus", "très", "bien", "comme", "mais", "sans",
  "entre", "vers", "après", "avant", "pendant", "aussi", "cette", "ces", "son", "mon", "ton", "notre", "votre", "elle", "elles",
  "ils", "nous", "vous", "est", "sont", "fait", "faire", "classe", "projet", "école", "année", "jour", "jours", "semaine", "mois",
  "élèves", "élève", "enfant", "enfants", "chacun", "chacune", "ensemble", "puis", "quand", "parce", "plutôt", "encore",
].map(normaliser));

/** Le singulier d'un mot, tel qu'on le trouve dans la banque : « animaux » → « animal », « légumes » → « légume ». */
export function singulier(mot: string): string {
  const m = mot.trim().toLocaleLowerCase("fr");
  if (m.endsWith("aux") && m.length > 4) return m.slice(0, -3) + "al";
  if ((m.endsWith("s") || m.endsWith("x")) && m.length > 3) return m.slice(0, -1);
  return m;
}

/** La forme sous laquelle deux mots se comparent : sans accent, au singulier. */
export const racine = (mot: string) => normaliser(singulier(mot)).replace(/[^a-z]/g, "");

/** Les mots d'un texte qui peuvent désigner un thème : quatre lettres au moins, hors mots outils, sans doublon. */
export function motsPorteurs(texte: string): string[] {
  const vus = new Set<string>();
  return (texte ?? "").toLocaleLowerCase("fr").split(/[^\p{L}]+/u).filter((m) => {
    if (m.length < 4 || VIDES.has(normaliser(m))) return false;
    const r = racine(m);
    if (!r || vus.has(r)) return false;
    vus.add(r);
    return true;
  });
}

/** Vrai si deux mots se valent : même racine, ou l'un commence l'autre (« jardin », « jardinage »). */
function proches(a: string, b: string): boolean {
  const x = racine(a), y = racine(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [court, long] = x.length <= y.length ? [x, y] : [y, x];
  return court.length >= 5 && long.startsWith(court);
}

/**
 * Les thèmes que le libellé des catégories révèle : « Les animaux » mène aux
 * animaux terrestres, domestiques, sauvages… Une catégorie dont le premier
 * mot répond passe avant celle qui ne répond que par un complément
 * (« Anatomie animale »), et les plus fournies avant les autres.
 */
export function themesParLibelle(texte: string, categories: CategorieArasaac[]): string[] {
  const mots = motsPorteurs(texte);
  if (!mots.length) return [];
  return themesProposables(categories)
    .flatMap((c) => {
      const tokens = libelleCategorie(c.nom).split(/[^\p{L}]+/u).filter((t) => t.length >= 4);
      const touche = tokens.findIndex((t) => mots.some((m) => proches(m, t)));
      return touche < 0 ? [] : [{ nom: c.nom, tete: touche === 0 ? 1 : 0, nombre: c.nombre }];
    })
    .sort((a, b) => b.tete - a.tete || b.nombre - a.nombre)
    .map((n) => n.nom);
}

/**
 * Les thèmes que les pictogrammes révèlent : les catégories où sont rangés
 * ceux qui portent un mot du projet — « soupe » est un aliment. La banque les
 * a comptés ; on garde celles qui font un thème, les plus fréquentes en tête.
 */
export function themesParPictos(comptes: CategorieArasaac[], categories: CategorieArasaac[]): string[] {
  const proposables = new Set(themesProposables(categories).map((c) => c.nom));
  return comptes.filter((c) => proposables.has(c.nom)).sort((a, b) => b.nombre - a.nombre).map((c) => c.nom);
}

/** Les mots à chercher dans la banque : chaque mot porteur du texte, et son singulier. */
export function formesAChercher(texte: string): string[] {
  const sortie = new Set<string>();
  for (const m of motsPorteurs(texte)) {
    sortie.add(m);
    const s = singulier(m);
    if (s.length >= 3) sortie.add(s);
  }
  return [...sortie];
}

export const THEMES_MAX = 3;

// ── Piocher les mots ──────────────────────────────────────────────────────

/** De la banque, un tirage de mots : un par image, des mots simples, par ordre alphabétique. */
export function motsDeLaBanque(pictos: { id: number; mot: string }[], combien: number, graine: number): string[] {
  const propres = uneImageParMot(pictos).map((x) => x.picto.mot.replace(/\s+/g, " ").trim())
    .filter((m) => m && !/[\d()[\]/:.!?"«»]/.test(m) && m.split(" ").length <= 3 && m.length <= 24);
  return piocher(hasard(graine), propres, Math.max(1, Math.round(combien) || 1)).sort((a, b) => a.localeCompare(b, "fr"));
}

// ── Préparer le corpus ────────────────────────────────────────────────────

/** Ce dont la préparation a besoin : la banque locale, l'IA, les noms à masquer — remplaçables pour les tests. */
export interface ServicesCorpus {
  /** La banque ARASAAC installée sur cet ordinateur ; ses catégories, ses pictogrammes. */
  banqueInstallee: () => Promise<boolean>;
  categories: () => Promise<CategorieArasaac[]>;
  themesDesMots: (mots: string[]) => Promise<CategorieArasaac[]>;
  selection: (themes: string[]) => Promise<{ id: number; mot: string }[]>;
  chercher: (mot: string) => Promise<{ id: number; mot: string }[]>;
  /** L'IA, en ligne ; rejette quand elle n'est pas réglée. */
  chat: (messages: ChatMessage[]) => Promise<string>;
  /** Les noms des élèves, à masquer avant tout envoi. */
  noms: () => Promise<string[]>;
}

export interface CorpusPrepare {
  mots: string[];
  phrases: string[];
  /** Les thèmes ARASAAC dont viennent les mots ; vide si la banque n'a rien donné. */
  themes: string[];
  /** D'où viennent les mots : la banque locale, l'IA, ou nulle part. */
  origineMots: "banque" | "ia" | "aucune";
  /** L'IA n'a pas répondu : pas de phrases, et pas de mots de repli. */
  sansIa: boolean;
}

/** Devine les thèmes ARASAAC d'un projet, dans la banque locale : par les libellés, puis par les pictogrammes. */
export async function devinerLesThemes(p: { titre: string; descriptif: string }, s: ServicesCorpus): Promise<string[]> {
  if (!(await s.banqueInstallee().catch(() => false))) return [];
  const categories = await s.categories().catch(() => [] as CategorieArasaac[]);
  if (!categories.length) return [];
  const texte = `${p.titre}\n${p.descriptif}`;
  const parLibelle = themesParLibelle(texte, categories);
  const formes = formesAChercher(texte);
  const parPictos = formes.length ? themesParPictos(await s.themesDesMots(formes).catch(() => []), categories) : [];
  return [...new Set([...parLibelle, ...parPictos])].slice(0, THEMES_MAX);
}

/** Les mots du projet, pris dans la banque : dans ses thèmes, sinon parmi les pictogrammes qui portent ses mots. */
export async function motsDeLaBanqueLocale(
  p: { titre: string; descriptif: string }, themes: string[], combien: number, graine: number, s: ServicesCorpus,
): Promise<string[]> {
  if (themes.length) {
    const mots = motsDeLaBanque(await s.selection(themes).catch(() => []), combien, graine);
    if (mots.length) return mots;
  }
  if (!(await s.banqueInstallee().catch(() => false))) return [];
  const trouves: { id: number; mot: string }[] = [];
  for (const forme of formesAChercher(`${p.titre}\n${p.descriptif}`)) trouves.push(...await s.chercher(forme).catch(() => []));
  return trouves.length ? motsDeLaBanque(trouves, combien, graine) : [];
}

/** Ce que l'IA écrit — les phrases, et les mots faute de banque ; le projet part sans les prénoms. */
export async function corpusParLIa(p: ProjetDecrit, d: DemandeCorpus, s: ServicesCorpus): Promise<Corpus> {
  const noms = await s.noms().catch(() => []);
  const masquer = (t: string) => pseudonymiser(t, noms).texte;
  const decrit = { titre: masquer(p.titre), descriptif: masquer(p.descriptif), domaines: masquer(p.domaines), etapes: p.etapes.map(masquer) };
  return corpusDeLaReponse(await s.chat(promptCorpus(decrit, d)));
}

/**
 * Prépare le corpus d'un projet : les mots dans la banque locale — dans les
 * thèmes choisis, ou devinés —, les phrases par l'IA avec ces mots. Faute de
 * banque, l'IA donne aussi les mots ; faute d'IA, on garde ce qu'on a.
 */
export async function preparerLeCorpus(
  p: ProjetDecrit, d: DemandeCorpus, s: ServicesCorpus, graine: number, themesChoisis?: string[],
): Promise<CorpusPrepare> {
  const themes = themesChoisis ?? await devinerLesThemes(p, s);
  let mots = d.mots > 0 ? await motsDeLaBanqueLocale(p, themes, d.mots, graine, s) : [];
  let origineMots: CorpusPrepare["origineMots"] = mots.length ? "banque" : "aucune";
  let phrases: string[] = [];
  let sansIa = false;
  try {
    if (mots.length || d.mots <= 0) {
      if (d.phrases > 0) phrases = (await corpusParLIa(p, { ...d, mots: 0, avec: mots }, s)).phrases;
    } else {
      const c = await corpusParLIa(p, d, s);
      mots = c.mots;
      phrases = c.phrases;
      if (mots.length) origineMots = "ia";
    }
  } catch {
    sansIa = true;
  }
  return { mots, phrases, themes: origineMots === "banque" ? themes : [], origineMots, sansIa };
}

/** Ce qu'on dit de la préparation, en une ligne. */
export function resumeDeLaPreparation(r: CorpusPrepare, d: DemandeCorpus): string {
  const avecPhrases = d.phrases > 0;
  const phrases = !avecPhrases ? "" : r.phrases.length ? `${r.phrases.length} phrases écrites par l'IA avec ces mots`
    : r.sansIa ? "les phrases attendent l'IA (Réglages › Mistral)" : "l'IA n'a pas donné de phrase lisible";
  if (r.origineMots === "banque") {
    const dou = r.themes.length ? ` (${r.themes.map(libelleCategorie).join(", ")})` : " (les pictogrammes qui portent les mots du projet)";
    return `${r.mots.length} mots pris dans la banque ARASAAC${dou}${phrases ? `, ${phrases}` : ""}. Relisez, retirez ce qui ne convient pas.`;
  }
  if (r.origineMots === "ia") return `Pas de thème pour ce projet dans la banque ARASAAC : ${r.mots.length} mots${r.phrases.length ? ` et ${r.phrases.length} phrases` : ""} écrits par l'IA. Relisez, retirez ce qui ne convient pas.`;
  if (d.mots <= 0) return phrases ? `${phrases.charAt(0).toUpperCase()}${phrases.slice(1)}.` : "Rien à écrire.";
  return r.sansIa
    ? "Rien trouvé dans la banque ARASAAC pour ce projet, et l'IA n'est pas réglée : écrivez les mots, ou choisissez un thème."
    : "Rien trouvé dans la banque ARASAAC pour ce projet, et l'IA n'a rien proposé de lisible : écrivez les mots, ou choisissez un thème.";
}

// ── Une seule préparation automatique ─────────────────────────────────────

/** Un titre qui dit quelque chose : ni vide, ni celui d'un projet qu'on vient de créer. */
export function titreExploitable(titre: string): boolean {
  const t = titre.trim();
  return t.length >= 3 && normaliser(t) !== "nouveau projet";
}

const reservees = new Set<string>();

/**
 * Réserve la préparation automatique d'un projet : une fois par projet et par
 * titre, le temps de la session. Un corpus qu'on a effacé exprès ne revient
 * pas tout seul ; un projet renommé retente sa chance.
 */
export function reserverLaPreparation(id: string, titre: string, corpusVide: boolean): boolean {
  if (!corpusVide || !titreExploitable(titre)) return false;
  const cle = `${id}|${titre.trim()}`;
  if (reservees.has(cle)) return false;
  reservees.add(cle);
  return true;
}
