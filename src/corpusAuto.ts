// ── Le corpus se prépare tout seul ────────────────────────────────────────
//
// Les mots viennent de la banque ARASAAC installée sur cet ordinateur : ils
// ont une image, et aucun n'est inventé. On devine les thèmes du projet de
// deux façons — par le libellé des catégories (« Les animaux » mène aux
// animaux terrestres) et par les pictogrammes qui portent les mots du titre
// (« soupe » est rangée dans les aliments) — ; faute de thème, l'IA en
// choisit parmi ceux de la banque. Puis, parmi les mots de ces thèmes, c'est
// l'IA qui retient ceux qui servent le projet : un tirage au hasard donnait
// le loup et le sanglier à une sortie à la ferme. Sans IA, on tire au
// hasard, et on le dit. Faute de banque, l'IA propose les mots. Les
// phrases, elles, viennent de l'IA, écrites avec ces mots. L'enseignant
// change tout : les thèmes, le tirage, les phrases, ou les mots à la main.

import type { CategorieArasaac, ChatMessage } from "./api";
import { normaliser } from "./competencesTravaillees";
import { pseudonymiser } from "./confidentialite";
import {
  corpusDeLaReponse, motsChoisisDeLaReponse, promptChoisirLesMots, promptChoisirLesThemes, promptCorpus, themesChoisisDeLaReponse,
  type DemandeCorpus, type ProjetDecrit,
} from "./corpusIa";
import type { Corpus } from "./corpusProjet";
import { CATEGORIES_FR, libelleCategorie } from "./data/categoriesArasaac";
import { hasard, melanger, piocher } from "./hasard";
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

/** Les mots propres d'un lot de pictogrammes : un par image, des mots simples, sans doublon. */
export function motsPropres(pictos: { id: number; mot: string }[]): string[] {
  return uneImageParMot(pictos).map((x) => x.picto.mot.replace(/\s+/g, " ").trim())
    .filter((m) => m && !/[\d()[\]/:.!?"«»]/.test(m) && m.split(" ").length <= 3 && m.length <= 24);
}

const parOrdre = (mots: string[]) => [...mots].sort((a, b) => a.localeCompare(b, "fr"));

/** De la banque, un tirage de mots au hasard : un par image, par ordre alphabétique. */
export function motsDeLaBanque(pictos: { id: number; mot: string }[], combien: number, graine: number): string[] {
  return parOrdre(piocher(hasard(graine), motsPropres(pictos), Math.max(1, Math.round(combien) || 1)));
}

/** Combien de mots de la banque on soumet au modèle, au plus : au-delà, la liste ne l'aide plus. */
export const CANDIDATS_MAX = 300;

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
  /** Parmi les mots de la banque, c'est l'IA qui a retenu ceux du projet — sinon, le hasard. */
  choisisParLIa: boolean;
  /** L'IA n'a pas répondu : ni choix, ni phrases, ni mots de repli. */
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

/** Les mots de la banque parmi lesquels choisir : ceux des thèmes, sinon ceux des pictogrammes qui portent les mots du projet. */
export async function candidatsDeLaBanque(
  p: { titre: string; descriptif: string }, themes: string[], s: ServicesCorpus,
): Promise<string[]> {
  if (themes.length) {
    const mots = motsPropres(await s.selection(themes).catch(() => []));
    if (mots.length) return mots;
  }
  if (!(await s.banqueInstallee().catch(() => false))) return [];
  const trouves: { id: number; mot: string }[] = [];
  for (const forme of formesAChercher(`${p.titre}\n${p.descriptif}`)) trouves.push(...await s.chercher(forme).catch(() => []));
  return motsPropres(trouves);
}

/** Le projet tel qu'il part vers l'IA : sans les prénoms des élèves. */
async function projetMasque(p: ProjetDecrit, s: ServicesCorpus): Promise<ProjetDecrit> {
  const noms = await s.noms().catch(() => []);
  const masquer = (t: string) => pseudonymiser(t, noms).texte;
  return { titre: masquer(p.titre), descriptif: masquer(p.descriptif), domaines: masquer(p.domaines), etapes: p.etapes.map(masquer) };
}

/** Ce que l'IA écrit — les phrases, et les mots faute de banque ; le projet part sans les prénoms. */
export async function corpusParLIa(p: ProjetDecrit, d: DemandeCorpus, s: ServicesCorpus): Promise<Corpus> {
  return corpusDeLaReponse(await s.chat(promptCorpus(await projetMasque(p, s), d)));
}

/**
 * Prépare le corpus d'un projet : les mots dans la banque locale — dans les
 * thèmes choisis, devinés, ou désignés par l'IA —, retenus par l'IA parmi
 * ceux de ces thèmes ; les phrases par l'IA avec ces mots. Faute de banque,
 * l'IA donne aussi les mots ; faute d'IA, on tire au hasard et l'on garde
 * ce qu'on a. `eviter` : les mots qu'on a déjà, quand on en veut d'autres.
 */
export async function preparerLeCorpus(
  p: ProjetDecrit, d: DemandeCorpus, s: ServicesCorpus, graine: number, themesChoisis?: string[], eviter: string[] = [],
): Promise<CorpusPrepare> {
  let sansIa = false;
  /** Un passage par l'IA ; le premier échec suffit, on n'insiste pas. */
  const ia = async (messages: ChatMessage[]): Promise<string | null> => {
    if (sansIa) return null;
    try { return await s.chat(messages); } catch { sansIa = true; return null; }
  };
  let decrit: ProjetDecrit | null = null;
  const masque = async () => (decrit ??= await projetMasque(p, s));

  let themes = themesChoisis ?? await devinerLesThemes(p, s);
  if (!themes.length && themesChoisis === undefined && d.mots > 0 && (await s.banqueInstallee().catch(() => false))) {
    // Ni les libellés ni les pictogrammes n'ont parlé : l'IA désigne des thèmes parmi ceux de la banque.
    const proposables = themesProposables(await s.categories().catch(() => [] as CategorieArasaac[]))
      .map((c) => ({ nom: c.nom, libelle: libelleCategorie(c.nom) }));
    const rep = proposables.length ? await ia(promptChoisirLesThemes(await masque(), proposables.map((c) => c.libelle), THEMES_MAX)) : null;
    if (rep) themes = themesChoisisDeLaReponse(rep, proposables, THEMES_MAX);
  }

  let mots: string[] = [];
  let choisisParLIa = false;
  if (d.mots > 0) {
    const candidats = await candidatsDeLaBanque(p, themes, s);
    const alea = hasard(graine);
    if (candidats.length > d.mots) {
      // Plus de mots que demandé : l'IA retient ceux du projet ; à défaut, le hasard.
      const soumis = melanger(alea, candidats).slice(0, CANDIDATS_MAX);
      const rep = await ia(promptChoisirLesMots(await masque(), soumis, d.mots, d.cycle, eviter));
      const choisis = rep ? motsChoisisDeLaReponse(rep, soumis, d.mots) : [];
      if (choisis.length >= Math.min(4, d.mots)) { mots = parOrdre(choisis); choisisParLIa = true; }
    }
    if (!mots.length) mots = parOrdre(piocher(alea, candidats, d.mots));
  }
  let origineMots: CorpusPrepare["origineMots"] = mots.length ? "banque" : "aucune";

  let phrases: string[] = [];
  if (mots.length || d.mots <= 0) {
    const rep = d.phrases > 0 ? await ia(promptCorpus(await masque(), { ...d, mots: 0, avec: mots })) : null;
    if (rep) phrases = corpusDeLaReponse(rep).phrases;
  } else {
    // Rien dans la banque : l'IA propose les mots, et les phrases avec.
    const rep = await ia(promptCorpus(await masque(), d));
    if (rep) {
      const c = corpusDeLaReponse(rep);
      mots = c.mots;
      phrases = c.phrases;
      if (mots.length) origineMots = "ia";
    }
  }
  return { mots, phrases, themes: origineMots === "banque" ? themes : [], origineMots, choisisParLIa, sansIa };
}

/** Ce qu'on dit de la préparation, en une ligne. */
export function resumeDeLaPreparation(r: CorpusPrepare, d: DemandeCorpus): string {
  const avecPhrases = d.phrases > 0;
  const phrases = !avecPhrases ? "" : r.phrases.length ? `${r.phrases.length} phrases écrites par l'IA avec ces mots`
    : r.sansIa ? "les phrases attendent l'IA (Réglages › Mistral)" : "l'IA n'a pas donné de phrase lisible";
  if (r.origineMots === "banque") {
    const dou = r.themes.length ? ` (${r.themes.map(libelleCategorie).join(", ")})` : " (les pictogrammes qui portent les mots du projet)";
    const comment = r.choisisParLIa ? `choisis par l'IA parmi ceux de la banque ARASAAC${dou}`
      : r.sansIa ? `tirés au hasard dans la banque ARASAAC${dou} — l'IA n'est pas réglée, elle ne les a pas choisis pour le projet`
      : `pris dans la banque ARASAAC${dou}`;
    return `${r.mots.length} mots ${comment}${phrases ? `, ${phrases}` : ""}. Relisez, retirez ce qui ne convient pas.`;
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
