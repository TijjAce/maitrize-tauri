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
// Mistral répond par un objet JSON, relu ici avec méfiance : ce qui ne se lit
// pas ne change rien. Un prénom d'élève tapé dans la conversation part masqué
// et revient ici (confidentialite.ts).

import { api, type ChatMessage, type ProjetClasse } from "./api";
import { normaliser } from "./competencesTravaillees";
import { pseudonymiserTout, restaurer } from "./confidentialite";
import { corpusDe, texteDuCorpus } from "./corpusProjet";
import { nomsAMasquer } from "./nomsAMasquer";
import { MOIS, ecrireEtapes, lireEtapes, nomDuMois, placer, semainesDuMois } from "./projets";

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
}

const ETAPES_MAX = 8;
const MOTS_MAX = 20;

/** Ce que l'assistant dit en ouvrant la fiche : raconter le projet, ou ce qu'on veut y changer. */
export function accueilDuProjet(p: ProjetClasse): string {
  const vide = !p.titre.trim() || p.titre.trim() === "Nouveau projet";
  if (vide && !lireEtapes(p.etapesJson).length) return "Racontez-moi votre projet : que voulez-vous faire avec la classe, et vers quand ?";
  return `« ${p.titre.trim()} » : que voulez-vous changer ? Le moment, les étapes, les mots du projet…`;
}

/** La fiche telle que l'assistant la lit. */
export function ficheDuProjet(p: ProjetClasse, annee: string): string {
  const semaine = semainesDuMois(annee, p.mois).find((s) => s.iso === p.semaine);
  const etapes = lireEtapes(p.etapesJson);
  const c = corpusDe(p);
  return [
    `Titre : ${p.titre.trim() || "(aucun)"}`,
    `Phrase qui dit le projet : ${p.descriptif.trim() || "(aucune)"}`,
    `Moment : ${nomDuMois(p.mois).toLowerCase()}, ${semaine ? `semaine du ${semaine.label}` : "tout le mois"}`,
    `Étapes : ${etapes.length ? etapes.map((e, i) => `${i + 1}. ${e.texte}${e.faite ? " (faite)" : ""}`).join(" ; ") : "(aucune)"}`,
    `Corpus : ${c.mots.length ? `${c.mots.length} mots (${c.mots.slice(0, 12).join(", ")}${c.mots.length > 12 ? "…" : ""})` : "pas encore de mots"}, `
      + `${c.phrases.length} phrase${c.phrases.length > 1 ? "s" : ""}`,
  ].join("\n");
}

/** La consigne de l'assistant, avec la fiche telle qu'elle est et le jour. */
export function consigneDeLAssistant(p: ProjetClasse, annee: string, aujourdhui: string): string {
  return [
    "Tu es l'assistant de Maitrize qui aide un enseignant du premier degré à lancer un projet de classe. Tu mènes la conversation : "
      + "une question à la fois, courte, et tu ranges dans la fiche du projet ce que l'enseignant dit ou accepte.",
    "La fiche a : un titre court ; une phrase qui dit le projet, qu'on peut lire aux élèves ; le mois, de septembre à juin, et la semaine "
      + "si l'enseignant la donne ; trois à six étapes concrètes, au présent, qu'on cochera ; un corpus de mots et de phrases pour les "
      + "ateliers de lecture, qui se prépare tout seul à partir du titre.",
    "Ordre conseillé : comprendre le projet et lui donner un titre et sa phrase ; le moment ; proposer les étapes ; demander enfin si "
      + "les mots du projet conviennent.",
    "Réponds uniquement par un objet JSON : {\"reponse\": \"…\", \"titre\": \"…\", \"descriptif\": \"…\", \"mois\": \"11\", "
      + "\"semaine\": \"AAAA-MM-JJ\", \"etapes\": [\"…\"], \"corpus\": \"preparer\", \"motsAjoutes\": [\"…\"], \"motsRetires\": [\"…\"]}.",
    "« reponse » est obligatoire : une ou deux phrases, en vouvoyant l'enseignant, qui disent ce que tu as rangé dans la fiche et posent "
      + "la question suivante. Les autres clés ne viennent que si elles changent quelque chose ; ne change rien que l'enseignant n'ait "
      + "demandé ou accepté, sauf pour proposer, au début, un titre, sa phrase et des étapes.",
    "« mois » : le numéro sur deux chiffres (09 à 12, 01 à 06). « semaine » : une date de la semaine voulue, ou \"\" pour tout le mois. "
      + "« etapes » : toutes les étapes, dans l'ordre. « corpus » : \"preparer\" pour refaire tout le corpus, \"mots\" pour tirer "
      + "d'autres mots, \"phrases\" pour réécrire les phrases. « motsAjoutes », « motsRetires » : des mots du corpus, au singulier.",
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
  return r;
}

/** La fiche avec ce que l'assistant a compris ; la même fiche s'il n'a rien changé. Une étape qu'il garde reste cochée. */
export function appliquerLaReponse(p: ProjetClasse, r: ReponseAssistant): ProjetClasse {
  let suite = { ...p };
  if (r.titre) suite.titre = r.titre;
  if (r.descriptif) suite.descriptif = r.descriptif;
  if (r.mois && r.mois !== p.mois) suite = placer(suite, r.mois, r.semaine ?? "");
  else if (r.semaine !== undefined) suite.semaine = r.semaine;
  if (r.etapes) {
    const avant = lireEtapes(p.etapesJson);
    suite.etapesJson = ecrireEtapes(r.etapes.map((texte) => ({ texte, faite: avant.some((e) => e.faite && normaliser(e.texte) === normaliser(texte)) })));
  }
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
