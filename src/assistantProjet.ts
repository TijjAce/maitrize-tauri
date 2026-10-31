// L'assistant d'un projet de classe : on raconte le projet, il le monte.
//
// La fiche d'un projet réunissait tout à la fois — titre, phrase, mois,
// semaine, corpus, thèmes, réglages de l'IA, étapes — et l'on s'y perdait :
// « il faudrait avoir plutôt un chatbot pour nous aider à lancer un projet »
// (l'enseignant, 31 octobre 2026). L'assistant pose les questions une à une,
// comprend la réponse et range ce qu'il en tire dans la fiche : le titre, la
// phrase qui dit le projet, le moment, les étapes, et ce qu'il faut faire du
// corpus — le refaire, tirer d'autres mots, réécrire les phrases, ajouter ou
// retirer un mot. Il répond en une ou deux phrases, et propose la suite.
//
// Puis « enlève le reste pour ne laisser que le chatbot » (le même jour) : la
// fiche n'a plus que lui. Il mène donc aussi le projet — cocher une étape,
// dire où en est le projet, réécrire une phrase — et dit, quand on le lui
// demande, ce que l'écran ne montre plus : le moment, les étapes, les mots.
// En s'ouvrant, il dit où en est un projet commencé.
//
// Mistral répond par un objet JSON, relu ici avec méfiance : ce qui ne se lit
// pas ne change rien. Un prénom d'élève tapé dans la conversation part masqué
// et revient ici (confidentialite.ts).

import { api, type ChatMessage, type ProjetClasse } from "./api";
import { normaliser } from "./competencesTravaillees";
import { pseudonymiserTout, restaurer } from "./confidentialite";
import { corpusDe, texteDuCorpus } from "./corpusProjet";
import { nomsAMasquer } from "./nomsAMasquer";
import { ETATS, MOIS, avancement, ecrireEtapes, etatDeduit, lireEtapes, nomDuMois, placer, semainesDuMois, type Etat } from "./projets";

/** Ce que l'assistant fait du corpus : tout refaire, tirer d'autres mots, réécrire les phrases. */
export type ActionCorpus = "preparer" | "mots" | "phrases";

/** Une réplique de la conversation : l'enseignant, ou l'assistant. */
export interface Replique { role: "user" | "assistant"; content: string }

/** Ce que l'assistant a compris : ce qu'il dit, et ce qui change dans la fiche — rien de plus que ce qu'il a lu. */
export interface ReponseAssistant {
  reponse: string;
  titre?: string;
  descriptif?: string;
  /** « 11 » pour novembre. */
  mois?: string;
  /** Le lundi de la semaine choisie ; « » : tout le mois. */
  semaine?: string;
  /** Toutes les étapes, dans l'ordre. */
  etapes?: string[];
  corpus?: ActionCorpus;
  motsAjoutes?: string[];
  motsRetires?: string[];
  /** Toutes les phrases du corpus, quand l'enseignant en change une. */
  phrases?: string[];
  /** Les numéros des étapes faites, ou à refaire, comptés à partir de 1. */
  cocher?: number[];
  decocher?: number[];
  /** Où en est le projet, dit par l'enseignant ; les étapes cochées le corrigent encore (voir `etatDeduit`). */
  etat?: Etat;
}

const ETAPES_MAX = 8;
const MOTS_MAX = 20;
const PHRASES_MAX = 12;
/** Ce que l'assistant lit du corpus : assez pour le redire. */
const MOTS_LUS = 40, PHRASES_LUES = 10;

const combien = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const momentDe = (p: ProjetClasse, annee: string) => {
  const semaine = semainesDuMois(annee, p.mois).find((s) => s.iso === p.semaine);
  return `${nomDuMois(p.mois).toLowerCase()}, ${semaine ? `semaine du ${semaine.label}` : "tout le mois"}`;
};

/**
 * Ce que l'assistant dit en ouvrant la fiche : raconter le projet, s'il est
 * neuf ; sinon où il en est — l'écran n'a plus que lui —, et ce qu'on peut
 * lui demander.
 */
export function accueilDuProjet(p: ProjetClasse, annee: string): string {
  const etapes = lireEtapes(p.etapesJson);
  const vide = !p.titre.trim() || p.titre.trim() === "Nouveau projet";
  if (vide && !etapes.length) return "Racontez-moi votre projet : que voulez-vous faire avec la classe, et vers quand ?";
  const { faites, total } = avancement(etapes);
  const c = corpusDe(p);
  const ou = total ? `${combien(faites, "étape")} faite${faites > 1 ? "s" : ""} sur ${total}` : "pas encore d'étape";
  const corpus = c.mots.length || c.phrases.length
    ? `${c.mots.length ? combien(c.mots.length, "mot") : "pas encore de mot"}, ${c.phrases.length ? combien(c.phrases.length, "phrase") : "pas encore de phrase"}`
    : "pas encore de mots";
  return `« ${p.titre.trim() || "Sans titre"} » : ${momentDe(p, annee)} ; ${ou} ; ${corpus}. `
    + "Que voulez-vous faire ? Cocher une étape, changer le moment, revoir les mots…";
}

/** La fiche telle que l'assistant la lit : tout ce qu'il peut redire. */
export function ficheDuProjet(p: ProjetClasse, annee: string): string {
  const etapes = lireEtapes(p.etapesJson);
  const c = corpusDe(p);
  const etat = ETATS.find((e) => e.id === etatDeduit(p.etat, etapes))?.nom.toLowerCase() ?? "à faire";
  return [
    `Titre : ${p.titre.trim() || "(aucun)"}`,
    `Phrase qui dit le projet : ${p.descriptif.trim() || "(aucune)"}`,
    `Moment : ${momentDe(p, annee)}`,
    `Où en est le projet : ${etat}`,
    `Étapes : ${etapes.length ? etapes.map((e, i) => `${i + 1}. ${e.texte}${e.faite ? " (faite)" : ""}`).join(" ; ") : "(aucune)"}`,
    `Mots : ${c.mots.length ? c.mots.slice(0, MOTS_LUS).join(", ") + (c.mots.length > MOTS_LUS ? `… (${c.mots.length} en tout)` : "") : "(pas encore)"}`,
    `Phrases : ${c.phrases.length ? c.phrases.slice(0, PHRASES_LUES).map((x, i) => `${i + 1}. ${x}`).join(" ")
      + (c.phrases.length > PHRASES_LUES ? ` … (${c.phrases.length} en tout)` : "") : "(pas encore)"}`,
  ].join("\n");
}

/** La consigne de l'assistant, avec la fiche telle qu'elle est et le jour. */
export function consigneDeLAssistant(p: ProjetClasse, annee: string, aujourdhui: string): string {
  return [
    "Tu es l'assistant de Maitrize qui aide un enseignant du premier degré à lancer, puis à mener, un projet de classe. L'enseignant "
      + "ne voit pas la fiche : il n'a que toi. Tu mènes la conversation : une question à la fois, courte, et tu ranges dans la fiche "
      + "ce que l'enseignant dit ou accepte ; quand tu changes quelque chose, dis-le.",
    "La fiche a : un titre court ; une phrase qui dit le projet, qu'on peut lire aux élèves ; le mois, de septembre à juin, et la semaine "
      + "si l'enseignant la donne ; trois à six étapes concrètes, au présent, qu'on cochera ; un corpus de mots et de phrases pour les "
      + "ateliers de lecture, qui se prépare tout seul à partir du titre.",
    "Ordre conseillé : comprendre le projet et lui donner un titre et sa phrase ; le moment ; proposer les étapes ; demander enfin si "
      + "les mots du projet conviennent.",
    "Réponds uniquement par un objet JSON : {\"reponse\": \"…\", \"titre\": \"…\", \"descriptif\": \"…\", \"mois\": \"11\", "
      + "\"semaine\": \"AAAA-MM-JJ\", \"etapes\": [\"…\"], \"cocher\": [2], \"decocher\": [1], \"etat\": \"encours\", \"corpus\": \"preparer\", "
      + "\"motsAjoutes\": [\"…\"], \"motsRetires\": [\"…\"], \"phrases\": [\"…\"]}.",
    "« reponse » est obligatoire : une ou deux phrases, en vouvoyant l'enseignant, qui disent ce que tu as rangé dans la fiche et posent "
      + "la question suivante. Les autres clés ne viennent que si elles changent quelque chose ; ne change rien que l'enseignant n'ait "
      + "demandé ou accepté, sauf pour proposer, au début, un titre, sa phrase et des étapes.",
    "« mois » : le numéro sur deux chiffres (09 à 12, 01 à 06). « semaine » : une date de la semaine voulue, ou \"\" pour tout le mois. "
      + "« etapes » : toutes les étapes, dans l'ordre. « corpus » : \"preparer\" pour refaire tout le corpus, \"mots\" pour tirer "
      + "d'autres mots, \"phrases\" pour réécrire les phrases. « motsAjoutes », « motsRetires » : des mots du corpus, au singulier. "
      + "« phrases » : toutes les phrases du corpus, quand l'enseignant en change, en ajoute ou en retire une.",
    "« cocher », « decocher » : les numéros des étapes faites, ou à refaire. « etat » : \"idee\" (à faire), \"encours\" (en cours) "
      + "ou \"fait\" (terminé).",
    "Quand l'enseignant demande le moment, les étapes, les mots, les phrases ou où en est le projet, réponds d'après la fiche, dans "
      + "« reponse » : recopie ce qu'il demande, sans rien changer.",
    "N'écris aucun prénom d'élève dans la fiche. Les marqueurs [P1], [P2]… remplacent des prénoms : ne les recopie pas dans la fiche.",
    `Aujourd'hui : ${aujourdhui}. Année scolaire ${annee}.`,
    "La fiche du projet, telle qu'elle est :",
    ficheDuProjet(p, annee),
  ].join("\n");
}

const chaine = (v: unknown, max: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : undefined;
};
const liste = (v: unknown, max: number, long: number): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const t = v.map((x) => chaine(x, long)).filter((x): x is string => !!x);
  return t.slice(0, max);
};

/** Le mois dit par le modèle : « 11 », 11, « novembre », « nov. » ; rien s'il n'est pas de l'année scolaire. */
export function moisLu(v: unknown): string | undefined {
  if (typeof v === "number") v = String(v);
  if (typeof v !== "string") return undefined;
  const t = normaliser(v).replace(/\.$/, "");
  const n = t.padStart(2, "0");
  return MOIS.find((m) => m.num === n || normaliser(m.nom) === t || normaliser(m.abrege).replace(/\.$/, "") === t)?.num;
}

/** Le lundi de la semaine qui contient `date`, parmi celles du mois ; rien si elle n'y est pas. */
function semaineDe(annee: string, mois: string, date: string): string | undefined {
  const jour = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const d = jour(date);
  return semainesDuMois(annee, mois).find((s) => d >= jour(s.iso) && d < jour(s.iso) + 7 * 864e5)?.iso;
}

/**
 * La réponse du modèle, relue : ce qui ne se lit pas ne change rien. Une
 * semaine se range dans le mois qu'elle donne, ou dans celui du projet.
 */
export function lireReponseAssistant(brut: string, annee: string, moisDuProjet: string): ReponseAssistant {
  let o: Record<string, unknown> = {};
  try {
    const debut = brut.indexOf("{"), fin = brut.lastIndexOf("}");
    const v: unknown = debut >= 0 && fin > debut ? JSON.parse(brut.slice(debut, fin + 1)) : null;
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch { /* une réponse en texte : elle se dit telle quelle */ }
  const texteSeul = !Object.keys(o).length ? chaine(brut, 600) : undefined;
  const r: ReponseAssistant = { reponse: chaine(o.reponse, 600) ?? texteSeul ?? "C'est noté. Que voulez-vous faire ensuite ?" };
  const titre = chaine(o.titre, 80), descriptif = chaine(o.descriptif, 300);
  if (titre) r.titre = titre;
  if (descriptif) r.descriptif = descriptif;
  const semaineBrute = typeof o.semaine === "string" ? o.semaine.trim() : undefined;
  const mois = moisLu(o.mois) ?? (semaineBrute ? moisLu(semaineBrute.slice(5, 7)) : undefined);
  if (mois) r.mois = mois;
  if (semaineBrute === "") r.semaine = "";
  else if (semaineBrute) {
    const s = semaineDe(annee, mois ?? moisDuProjet, semaineBrute);
    if (s) r.semaine = s;
  }
  const etapes = liste(o.etapes, ETAPES_MAX, 140);
  if (etapes?.length) r.etapes = etapes;
  if (o.corpus === "preparer" || o.corpus === "mots" || o.corpus === "phrases") r.corpus = o.corpus;
  const ajoutes = liste(o.motsAjoutes, MOTS_MAX, 40), retires = liste(o.motsRetires, MOTS_MAX, 40);
  if (ajoutes?.length) r.motsAjoutes = ajoutes;
  if (retires?.length) r.motsRetires = retires;
  const phrases = liste(o.phrases, PHRASES_MAX, 200);
  if (phrases?.length) r.phrases = phrases;
  const cocher = numeros(o.cocher), decocher = numeros(o.decocher);
  if (cocher) r.cocher = cocher;
  if (decocher) r.decocher = decocher;
  const etat = etatLu(o.etat);
  if (etat) r.etat = etat;
  return r;
}

/** Des numéros d'étapes : des entiers de 1 au nombre d'étapes possible, chacun une fois. */
function numeros(v: unknown): number[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const n = [...new Set(v.map((x) => Math.round(Number(x))).filter((x) => Number.isInteger(x) && x >= 1 && x <= ETAPES_MAX))];
  return n.length ? n : undefined;
}

const ETATS_DITS: Record<string, Etat> = { idee: "idee", "a faire": "idee", encours: "encours", "en cours": "encours", fait: "fait", termine: "fait" };

/** L'état dit par le modèle : « encours », « en cours », « terminé »… ; rien s'il ne se lit pas. */
export const etatLu = (v: unknown): Etat | undefined => (typeof v === "string" ? ETATS_DITS[normaliser(v).replace(/[-_]/g, " ")] : undefined);

/** La fiche avec ce que l'assistant a compris ; la même fiche s'il n'a rien changé. Une étape qu'il garde reste cochée. */
export function appliquerLaReponse(p: ProjetClasse, r: ReponseAssistant): ProjetClasse {
  let suite = { ...p };
  if (r.titre) suite.titre = r.titre;
  if (r.descriptif) suite.descriptif = r.descriptif;
  if (r.mois && r.mois !== p.mois) suite = placer(suite, r.mois, r.semaine ?? "");
  else if (r.semaine !== undefined) suite.semaine = r.semaine;
  let etapes = lireEtapes(p.etapesJson);
  if (r.etapes) {
    const avant = etapes;
    etapes = r.etapes.map((texte) => ({ texte, faite: avant.some((e) => e.faite && normaliser(e.texte) === normaliser(texte)) }));
  }
  if (r.cocher || r.decocher) {
    etapes = etapes.map((e, i) => (r.cocher?.includes(i + 1) ? { ...e, faite: true } : r.decocher?.includes(i + 1) ? { ...e, faite: false } : e));
  }
  if (r.etapes || r.cocher || r.decocher) suite.etapesJson = ecrireEtapes(etapes);
  // L'état suit les étapes cochées, sauf « terminé » dit par l'enseignant ; une étape qu'on décoche rouvre le projet terminé.
  const base = r.etat ?? (r.decocher && p.etat === "fait" ? "encours" : p.etat);
  if (r.etapes || r.cocher || r.decocher || r.etat) suite.etat = etatDeduit(base, etapes);
  if (r.phrases) suite.phrases = texteDuCorpus(r.phrases);
  if (r.motsAjoutes || r.motsRetires) {
    const retires = new Set((r.motsRetires ?? []).map(normaliser));
    const mots = corpusDe(p).mots.filter((m) => !retires.has(normaliser(m)));
    for (const m of r.motsAjoutes ?? []) if (!mots.some((x) => normaliser(x) === normaliser(m))) mots.push(m);
    suite.mots = texteDuCorpus(mots);
  }
  const change = (Object.keys(suite) as (keyof ProjetClasse)[]).some((k) => suite[k] !== p[k]);
  return change ? suite : p;
}

/**
 * Demande à l'assistant la suite de la conversation. Tout ce qui part — la
 * fiche, les répliques — passe par le masque des prénoms ; ce qui revient est
 * remis en clair, puis relu.
 */
export async function demanderALAssistant(p: ProjetClasse, annee: string, fil: Replique[], aujourdhui: string): Promise<ReponseAssistant> {
  // L'accueil n'est qu'à l'écran : la conversation qui part commence par l'enseignant.
  const premier = fil.findIndex((m) => m.role === "user");
  const envoyes = premier < 0 ? [] : fil.slice(premier);
  const textes = [consigneDeLAssistant(p, annee, aujourdhui), ...envoyes.map((m) => m.content)];
  const { textes: masques, table } = pseudonymiserTout(textes, await nomsAMasquer());
  const messages: ChatMessage[] = [
    { role: "system", content: masques[0] },
    ...envoyes.map((m, i): ChatMessage => ({ role: m.role, content: masques[i + 1] })),
  ];
  const brut = await api.mistralChat(messages, await api.modeleActif(), true);
  return lireReponseAssistant(restaurer(brut, table).texte, annee, p.mois);
}
