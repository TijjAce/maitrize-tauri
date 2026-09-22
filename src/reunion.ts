// ── Réunions écoutées et résumées ─────────────────────────────────────────
//
// Une ESS dure une heure, on y parle vite, et l'on en ressort avec trois mots
// griffonnés. L'application écrit ce qui se dit, au fur et à mesure, et résume
// toutes les dix phrases : à la fin, le compte rendu s'assemble à partir des
// résumés, et il ne reste qu'à relire.
//
// Le texte est un seul bloc, qui grandit — on le voit s'écrire, on le corrige,
// et l'on peut aussi y taper soi-même : une réunion se prend parfois au
// clavier, et le résumé arrive alors de la même façon.
//
// Résumer toutes les dix phrases plutôt que toutes les cinq minutes n'est pas
// un détail : cinq minutes de tour de table valent une ligne, cinq minutes de
// décisions en valent dix. Le découpage suit donc ce qui est dit, pas la
// montre.
//
// Ce qui sort de l'ordinateur : l'audio part chez Mistral pour être transcrit,
// puis le texte pour être résumé — prénoms d'élèves masqués (voir
// `confidentialite.ts`), remis au retour. L'audio n'est jamais écrit sur le
// disque.

import { api, type Reunion, MODELE_TACHES } from "./api";
import { pseudonymiser, restaurer } from "./confidentialite";

/**
 * Durée d'une tranche, en secondes.
 *
 * Gardée pour relire les réunions des versions 1.6.13 et 1.6.14, qui
 * résumaient toutes les cinq minutes.
 */
export const TRANCHE_S = 300;

/**
 * Le morceau d'audio envoyé à la transcription.
 *
 * C'est le rythme auquel le texte s'écrit à l'écran : trois quarts de minute,
 * assez court pour voir la réunion s'écrire, assez long pour qu'une phrase
 * coupée en deux reste rare.
 */
export const MORCEAU_S = 45;

/**
 * Le rangement au fil de l'eau : dès la phrase suivante.
 *
 * Il ne s'agit pas d'attendre d'avoir de quoi résumer, mais de ne jamais
 * laisser traîner de parole brute à l'écran : ce qui est dit est rangé
 * aussitôt, et l'enseignant lit un compte rendu, pas un verbatim.
 */
export const PHRASES_PAR_RANGEMENT = 1;

/**
 * La relecture de fond : toutes les dix phrases.
 *
 * Ranger deux phrases à la fois fait un document juste mais bavard — les
 * mêmes idées reviennent sous trois formulations, et les lignes s'allongent.
 * Une seconde lecture reprend l'ensemble et resserre : elle voit ce qu'un
 * passage seul ne peut pas voir.
 */
export const PHRASES_PAR_RELECTURE = 10;

/** Les réunions d'un enseignant du premier degré, ESMS compris. */
export const GENRES = [
  "ESS",
  "Équipe éducative",
  "Réunion de synthèse",
  "Conseil de cycle",
  "Conseil des maîtres",
  "Conseil d'école",
  "Concertation",
  "Rencontre avec la famille",
  "Animation pédagogique",
  "Formation",
  "Autre réunion",
] as const;

export type Genre = (typeof GENRES)[number];

export type EtatTranche = "attente" | "transcription" | "resume" | "fait" | "echec";

/** Cinq minutes de réunion : ce qui a été dit, et ce qu'on en retient. */
export interface Tranche {
  id: string;
  /** Rang dans la réunion, à partir de 1. */
  rang: number;
  /** Bornes en secondes depuis le début de la réunion. */
  debut: number;
  fin: number;
  transcription: string;
  resume: string;
  etat: EtatTranche;
  erreur?: string;
}

/** « 00:00 → 05:00 » */
export function horodatage(t: { debut: number; fin: number }): string {
  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  return `${mmss(t.debut)} → ${mmss(t.fin)}`;
}

/** « 1 h 05 » — la durée écoutée, telle qu'on la dit. */
export function dureeLisible(secondes: number): string {
  const m = Math.round(secondes / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

/** Ce qui reste avant la prochaine coupe. */
export function restantAvantLaCoupe(secondesDeLaTranche: number, tranche = TRANCHE_S): number {
  return Math.max(0, tranche - secondesDeLaTranche);
}

// ── Lecture et écriture des tranches ──────────────────────────────────────
//
// Une tranche encore en cours de transcription n'a pas à être enregistrée
// comme telle : si l'application se ferme entre-temps, l'audio est perdu et
// l'état « transcription en cours » ne voudrait plus rien dire au retour.

export function lireTranches(json: string): Tranche[] {
  let brut: unknown;
  try { brut = JSON.parse(json || "[]"); } catch { return []; }
  if (!Array.isArray(brut)) return [];
  return brut.flatMap((x, i): Tranche[] => {
    if (!x || typeof x !== "object") return [];
    const o = x as Record<string, unknown>;
    const nombre = (v: unknown, repli: number) => (typeof v === "number" && isFinite(v) ? v : repli);
    const texte = (v: unknown) => (typeof v === "string" ? v : "");
    const rang = nombre(o.rang, i + 1);
    const etat = texte(o.etat);
    return [{
      id: texte(o.id) || `t${rang}`,
      rang,
      debut: nombre(o.debut, (rang - 1) * TRANCHE_S),
      fin: nombre(o.fin, rang * TRANCHE_S),
      transcription: texte(o.transcription),
      resume: texte(o.resume),
      // Une tranche relue d'une ancienne session n'est plus « en cours ».
      etat: etat === "echec" ? "echec" : "fait",
      erreur: texte(o.erreur) || undefined,
    }];
  });
}

export function ecrireTranches(tranches: Tranche[]): string {
  const posables = tranches
    .filter((t) => t.etat === "fait" || t.etat === "echec")
    .map((t) => ({
      id: t.id, rang: t.rang, debut: t.debut, fin: t.fin,
      transcription: t.transcription, resume: t.resume, etat: t.etat,
      ...(t.erreur ? { erreur: t.erreur } : {}),
    }));
  return JSON.stringify(posables);
}


// ── Le texte de la réunion, et ses résumés ────────────────────────────────
//
// Le texte s'écrit d'un bout à l'autre : la transcription s'y ajoute au fil
// de l'écoute, et l'on peut aussi y taper soi-même — une réunion se prend
// parfois au clavier. Les résumés, eux, ne suivent plus la montre mais le
// texte : dix phrases, un résumé.

export type EtatResume = "encours" | "fait" | "echec";

/** Un résumé portant sur les phrases [de, a[ du texte de la réunion. */
export interface Resume {
  id: string;
  rang: number;
  de: number;
  a: number;
  texte: string;
  etat: EtatResume;
  /** Où l'on en était, en secondes d'écoute — absent si le texte a été tapé. */
  quand?: number;
  erreur?: string;
}

/**
 * Découpe un texte en phrases.
 *
 * Sans recherche en arrière (lookbehind) : les webviews de macOS 11 ne la
 * connaissent pas, et l'application planterait à la première phrase.
 */
export function decouperEnPhrases(texte: string): string[] {
  const phrases: string[] = [];
  let courante = "";
  for (const ch of texte) {
    if (ch === "\n") { phrases.push(courante); courante = ""; continue; }
    courante += ch;
    if (".!?…".includes(ch)) { phrases.push(courante); courante = ""; }
  }
  phrases.push(courante);
  return phrases.map((p) => p.trim()).filter(Boolean);
}

/** Jusqu'où les résumés sont déjà allés dans le texte. */
export function phrasesDejaResumees(resumes: Resume[]): number {
  return resumes.reduce((m, r) => Math.max(m, r.a), 0);
}

/**
 * Les phrases qui attendent un résumé.
 *
 * Si le texte a été raccourci à la main, le repère est ramené à sa longueur :
 * mieux vaut re-résumer que de ne plus rien résumer du tout.
 */
export function phrasesEnAttente(texte: string, resumes: Resume[]): { de: number; phrases: string[] } {
  const toutes = decouperEnPhrases(texte);
  const de = Math.min(phrasesDejaResumees(resumes), toutes.length);
  return { de, phrases: toutes.slice(de) };
}

/** Faut-il ranger maintenant ? */
export const assezPourResumer = (attente: number, seuil = PHRASES_PAR_RANGEMENT) => attente >= seuil;

/** Faut-il relire l'ensemble ? */
export const assezPourRelire = (depuisLaRelecture: number, seuil = PHRASES_PAR_RELECTURE) =>
  depuisLaRelecture >= seuil;

export function lireResumes(json: string): Resume[] {
  let brut: unknown;
  try { brut = JSON.parse(json || "[]"); } catch { return []; }
  if (!Array.isArray(brut)) return [];
  return brut.flatMap((x, i): Resume[] => {
    if (!x || typeof x !== "object") return [];
    const o = x as Record<string, unknown>;
    const nombre = (v: unknown, repli: number) => (typeof v === "number" && isFinite(v) ? v : repli);
    const chaine = (v: unknown) => (typeof v === "string" ? v : "");
    const rang = nombre(o.rang, i + 1);
    return [{
      id: chaine(o.id) || `r${rang}`,
      rang,
      de: nombre(o.de, 0),
      a: nombre(o.a, 0),
      texte: chaine(o.texte),
      // Un résumé relu n'est plus « en cours » : son texte ne viendra plus.
      etat: chaine(o.etat) === "echec" ? "echec" : "fait",
      quand: typeof o.quand === "number" ? o.quand : undefined,
      erreur: chaine(o.erreur) || undefined,
    }];
  });
}

export function ecrireResumes(resumes: Resume[]): string {
  return JSON.stringify(resumes
    .filter((r) => r.etat !== "encours")
    .map((r) => ({
      id: r.id, rang: r.rang, de: r.de, a: r.a, texte: r.texte, etat: r.etat,
      ...(r.quand != null ? { quand: r.quand } : {}),
      ...(r.erreur ? { erreur: r.erreur } : {}),
    })));
}

/**
 * Relit une réunion enregistrée avant ce changement.
 *
 * Les versions 1.6.13 et 1.6.14 gardaient une transcription et un résumé par
 * tranche de cinq minutes. On en refait le texte suivi et des résumés posés
 * sur les phrases correspondantes, pour qu'une vieille réunion s'ouvre comme
 * une neuve.
 */
export function convertirAnciennes(tranchesJson: string): { texte: string; resumes: Resume[] } {
  const tranches = lireTranches(tranchesJson);
  if (!tranches.length) return { texte: "", resumes: [] };
  let texte = "";
  const resumes: Resume[] = [];
  let posees = 0;
  for (const t of [...tranches].sort((a, b) => a.rang - b.rang)) {
    const morceau = t.transcription.trim();
    if (morceau) texte = texte ? `${texte} ${morceau}` : morceau;
    const jusque = decouperEnPhrases(texte).length;
    resumes.push({
      id: t.id, rang: t.rang, de: posees, a: Math.max(posees, jusque),
      texte: t.resume, etat: t.etat === "echec" ? "echec" : "fait",
      quand: t.fin, erreur: t.erreur,
    });
    posees = Math.max(posees, jusque);
  }
  return { texte, resumes };
}

/**
 * Pose à la fin du document la parole qui vient d'être dite.
 *
 * Elle y reste en vrac, visible, jusqu'à ce que l'agent la range : c'est ce
 * qu'on voit s'écrire dans l'encadré pendant que la réunion avance.
 */
export function ajouterAuDocument(document: string, morceau: string): string {
  const propre = morceau.trim();
  if (!propre) return document;
  if (!document.trim()) return propre;
  return `${document.trimEnd()}\n\n${propre}`;
}

/** Ajoute ce qui vient d'être transcrit au texte de la réunion. */
export function ajouterAuTexte(texte: string, morceau: string): string {
  const propre = morceau.trim();
  if (!propre) return texte;
  if (!texte.trim()) return propre;
  // Un point manquant entre deux morceaux collerait deux phrases en une.
  const fin = texte.trimEnd();
  const separateur = ".!?…".includes(fin.slice(-1)) ? " " : ". ";
  return fin + separateur + propre;
}

// ── Ce qu'on demande au modèle ────────────────────────────────────────────

/** Le résumé d'un passage : des puces, rien d'autre. */
export function promptPassage(genre: string, titre: string, passage: string) {
  const quoi = [genre, titre].filter(Boolean).join(" — ") || "une réunion";
  return [
    {
      role: "system" as const,
      content: [
        "Tu assistes un enseignant du premier degré pendant " + quoi + ".",
        "On te donne un passage de la réunion, tel qu'il vient d'être écrit : plusieurs personnes parlent, le texte contient des hésitations et des erreurs de transcription.",
        "Rends les points importants sous forme de puces commençant par « - », une idée par puce, à l'infinitif ou en phrase courte.",
        "Garde ce qui compte pour la suite : décisions, échéances, chiffres, dispositifs cités, ce que chacun s'engage à faire.",
        "N'invente rien, n'interprète pas, n'ajoute aucun commentaire ni titre.",
        "Ignore les bavardages, les répétitions et ce qui n'a pas de suite.",
        "Si ce passage n'apporte rien (bavardage, hors sujet), réponds exactement : —",
        "Les marqueurs entre crochets comme [P1] remplacent des prénoms : recopie-les exactement.",
      ].join(" "),
    },
    { role: "user" as const, content: passage },
  ];
}

/** Le compte rendu final, à partir des résumés de tranches. */
export function promptCompteRendu(r: {
  genre: string; titre: string; date: string; participants: string; resumes: string;
}) {
  const entete = [
    r.genre && `Type : ${r.genre}`,
    r.titre && `Objet : ${r.titre}`,
    r.date && `Date : ${r.date}`,
    r.participants && `Participants : ${r.participants}`,
  ].filter(Boolean).join("\n");
  return [
    {
      role: "system" as const,
      content: [
        "Tu rédiges le compte rendu d'une réunion pour un enseignant du premier degré (maternelle, élémentaire ou ESMS).",
        "On te donne les résumés successifs de la réunion, passage par passage, dans l'ordre.",
        "Rends un compte rendu en français, sobre et professionnel, structuré avec exactement ces titres, chacun sur sa ligne et précédé de « ## » :",
        "## Points abordés, ## Décisions, ## Ce que je dois faire, ## À revoir.",
        "Sous chaque titre, des puces commençant par « - ». Regroupe ce qui se répète d'un passage à l'autre, garde l'ordre chronologique des sujets.",
        "Sous « Ce que je dois faire », ne mets que ce qui incombe à l'enseignant, avec l'échéance si elle a été dite.",
        "Sous « À revoir », mets ce qui est resté en suspens ou ce qui n'a pas été compris.",
        "Si une rubrique est vide, écris « - Rien à signaler ».",
        "N'invente rien : pas de nom, pas de date, pas de décision qui ne soit dans les résumés.",
        "Les marqueurs entre crochets comme [P1] remplacent des prénoms : recopie-les exactement.",
      ].join(" "),
    },
    { role: "user" as const, content: `${entete}\n\nRésumés successifs :\n${r.resumes}` },
  ];
}


// ── Le compte rendu vivant ────────────────────────────────────────────────
//
// Une liste de résumés bout à bout n'est pas un compte rendu : on y relit
// trois fois la même décision, et ce qui compte se perd entre deux
// bavardages. Ici, un seul document existe, et il est **réagencé** à chaque
// passage : ce qui est nouveau va sous le bon titre, ce qui se répète
// fusionne, et une remarque devenue décision change de rubrique.
//
// Le document sert aussi de mémoire à l'agent : on lui donne à chaque fois
// l'état actuel et le passage qui vient d'être dit, et il rend l'état
// suivant. Rien d'autre n'est conservé entre deux appels.

export const RUBRIQUES = [
  "Points abordés",
  "Décisions",
  "Ce que je dois faire",
  "À revoir",
] as const;

/** Le compte rendu, rubrique par rubrique. */
export type Plan = Record<string, string[]>;

const normaliserTitre = (t: string) =>
  t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Lit un compte rendu écrit en « ## Rubrique » et « - point ». */
export function lirePlan(markdown: string): Plan {
  const parRubrique = new Map(RUBRIQUES.map((r) => [normaliserTitre(r), r]));
  const plan: Plan = {};
  let courante = "";
  for (const ligne of (markdown || "").split("\n")) {
    const titre = ligne.match(/^\s*#{1,3}\s*(.+?)\s*$/);
    if (titre) {
      const connue = parRubrique.get(normaliserTitre(titre[1]));
      courante = connue ?? "";
      if (courante && !plan[courante]) plan[courante] = [];
      continue;
    }
    const point = ligne.match(/^\s*[-*•]\s*(.+?)\s*$/);
    if (courante && point && point[1].trim()) {
      (plan[courante] ??= []).push(point[1].trim());
    }
  }
  return plan;
}

/** Réécrit un compte rendu, rubriques dans l'ordre, vides comprises. */
export function ecrirePlan(plan: Plan): string {
  return RUBRIQUES
    .map((r) => {
      const points = (plan[r] ?? []).filter((p) => p.trim());
      return `## ${r}\n${points.length ? points.map((p) => `- ${p}`).join("\n") : "- Rien à signaler"}`;
    })
    .join("\n\n");
}

/** Le compte rendu est-il encore vide de tout contenu réel ? */
export function planVide(plan: Plan): boolean {
  return RUBRIQUES.every((r) => (plan[r] ?? []).every((p) => /^rien à signaler\.?$/i.test(p.trim())));
}

/**
 * Le nouvel état, en refusant les pertes.
 *
 * Un modèle qui répond trop court effacerait la moitié de la réunion : une
 * rubrique qui revient vide alors qu'elle était remplie est donc ignorée, et
 * l'ancienne reste. Le texte brut, lui, garde tout de toute façon.
 */
export function fusionnerPlan(ancien: Plan, nouveau: Plan): Plan {
  const sortie: Plan = {};
  for (const r of RUBRIQUES) {
    const avant = (ancien[r] ?? []).filter((p) => p.trim() && !/^rien à signaler\.?$/i.test(p.trim()));
    const apres = (nouveau[r] ?? []).filter((p) => p.trim() && !/^rien à signaler\.?$/i.test(p.trim()));
    sortie[r] = apres.length >= 1 || avant.length === 0 ? apres : avant;
  }
  return sortie;
}

/**
 * Ce qu'on demande à l'agent : ranger le document, pas en fabriquer un autre.
 *
 * Il n'y a qu'un encadré à l'écran, et ce qui vient d'être dit s'y écrit à la
 * suite, brut. L'agent reçoit donc ce document entier — rubriques déjà
 * rangées, puis la parole en vrac à la fin — et le rend rangé.
 */
export function promptRangement(a: { genre: string; titre: string; document: string }) {
  const quoi = [a.genre, a.titre].filter(Boolean).join(" — ") || "une réunion";
  return [
    {
      role: "system" as const,
      content: [
        "Tu tiens à jour le compte rendu d'" + quoi + ", pendant qu'elle a lieu.",
        "On te donne le document tel qu'il est à l'écran : des rubriques déjà rangées, puis, à la fin, ce qui vient d'être dit — transcription brute, avec hésitations et erreurs, pas encore rangée.",
        "Rends le document **entier et rangé**, avec exactement ces quatre titres précédés de « ## » :",
        RUBRIQUES.map((r) => `## ${r}`).join(", ") + ".",
        "Sous chaque titre, des puces courtes commençant par « - », une idée par puce.",
        "Range la parole en vrac sous les bonnes rubriques, et fais-la disparaître de la fin : rien ne doit rester hors des quatre rubriques.",
        "Garde mot pour mot ce qui était déjà rangé, sauf si la suite le précise, le corrige ou le contredit ;",
        "fusionne ce qui redit la même chose ; déplace une ligne si elle a changé de nature — une piste devenue décision va sous « Décisions » ;",
        "sous « Ce que je dois faire », ne mets que ce qui incombe à l'enseignant, avec l'échéance si elle a été dite.",
        "N'invente rien : aucune décision, aucune date, aucun nom qui ne soit dit.",
        "Ignore les bavardages et ce qui n'a pas de suite.",
        "Si une rubrique est vide, écris « - Rien à signaler ».",
        "Les marqueurs entre crochets comme [P1] remplacent des prénoms : recopie-les exactement.",
      ].join(" "),
    },
    { role: "user" as const, content: a.document },
  ];
}

/**
 * Range le document et rend le suivant.
 *
 * Les prénoms partent masqués — titre compris, pour que [P1] désigne la même
 * personne partout. Une réponse tronquée ne fait rien perdre : les rubriques
 * revenues vides gardent leur contenu d'avant (voir `fusionnerPlan`), et le
 * texte brut de la réunion est conservé à part de toute façon.
 */
export async function rangerLeDocument(
  document: string,
  contexte: { genre: string; titre: string },
): Promise<string> {
  if (!document.trim()) return document;
  const { parts, table } = masquerTout([contexte.titre, document], await nomsDesEleves());
  const [titre, docMasque] = parts;
  const modele = await api.modeleActif(MODELE_TACHES);
  const rep = await api.mistralChat(
    promptRangement({ genre: contexte.genre, titre, document: docMasque }), modele);
  const fusionne = fusionnerPlan(lirePlan(docMasque), lirePlan(nettoyer(rep)));
  if (planVide(fusionne)) throw new Error("L'agent n'a rien rendu d'exploitable.");
  return restaurer(ecrirePlan(fusionne), table).texte;
}

/** Ce que les modèles ajoutent parfois autour de la réponse. */
export function nettoyer(rep: string): string {
  return rep.trim().replace(/^```[a-z]*\n?|\n?```$/g, "").trim();
}

/** Un résumé vide, ou le tiret que le modèle renvoie quand il n'y a rien. */
export function riendedit(resume: string): boolean {
  return !resume.trim() || /^[-—–.\s]*$/.test(resume.trim());
}

// ── Les appels à l'IA ─────────────────────────────────────────────────────

/** Les prénoms de la classe, pour les masquer avant l'envoi du texte. */
async function nomsDesEleves(): Promise<string[]> {
  return api.elevesList().then((l) => l.map((e) => e.nom)).catch(() => []);
}

/**
 * Masque les noms d'élèves dans **tout** ce qui part, d'un seul tenant.
 *
 * L'objet d'une réunion s'écrit « ESS de Camille Bernard » : le titre part
 * dans la consigne, et il aurait suffi de masquer la transcription pour que
 * le nom sorte quand même. On masque donc les morceaux ensemble, avec une
 * seule table — [P1] désigne alors la même personne dans le titre et dans le
 * texte, ce qu'un masquage séparé ne garantirait pas.
 */
const SEPARE = "\u0000";
function masquerTout(morceaux: string[], noms: string[]) {
  const { texte, table } = pseudonymiser(morceaux.join(SEPARE), noms);
  const parts = texte.split(SEPARE);
  return { parts: morceaux.map((_, i) => parts[i] ?? ""), table };
}

/**
 * Résume une tranche. La transcription arrive de l'audio (déjà partie chez
 * Mistral) ; pour le résumé, les prénoms connus sont masqués et remis ici.
 */
export async function resumerPassage(
  passage: string,
  contexte: { genre: string; titre: string },
): Promise<string> {
  if (!passage.trim()) return "";
  const { parts, table } = masquerTout([contexte.titre, passage], await nomsDesEleves());
  const [titre, masque] = parts;
  const modele = await api.modeleActif(MODELE_TACHES);
  const rep = await api.mistralChat(promptPassage(contexte.genre, titre, masque), modele);
  const propre = nettoyer(rep);
  return restaurer(propre, table).texte;
}

/** Où en était la réunion quand ce résumé a été fait. */
export function repereDuResume(r: Resume): string {
  const phrases = `phrases ${r.de + 1}–${r.a}`;
  if (r.quand == null) return phrases;
  const m = Math.floor(r.quand / 60);
  return `${m} min · ${phrases}`;
}

/**
 * La seconde lecture : celle qui voit ce qu'un passage seul ne voit pas.
 *
 * Le rangement au fil de l'eau ne connaît que le document et deux phrases :
 * il ne peut pas savoir que la ligne qu'il ajoute redit, autrement, ce qui
 * est écrit trois rubriques plus haut. La relecture, elle, a tout sous les
 * yeux — c'est là qu'on resserre.
 */
export function promptRelecture(a: { genre: string; titre: string; document: string }) {
  const quoi = [a.genre, a.titre].filter(Boolean).join(" — ") || "une réunion";
  return [
    {
      role: "system" as const,
      content: [
        "Tu relis le compte rendu d'" + quoi + ", pendant qu'elle a lieu.",
        "Il a été rangé au fil de l'eau, deux phrases à la fois : il contient donc des redites, des lignes trop longues et des points qui se recoupent.",
        "Resserre-le, sans rien perdre : fusionne ce qui dit deux fois la même chose, regroupe ce qui va ensemble, raccourcis les tournures, jette ce qui n'a eu aucune suite.",
        "Ne supprime jamais une décision, une échéance, un engagement, un chiffre ni un nom de dispositif.",
        "Ne rajoute rien : aucune idée qui ne soit déjà écrite.",
        "Rends le document **entier**, avec exactement ces quatre titres précédés de « ## » :",
        RUBRIQUES.map((r) => `## ${r}`).join(", ") + ".",
        "Sous chaque titre, des puces courtes commençant par « - ». Si une rubrique est vide, écris « - Rien à signaler ».",
        "Les marqueurs entre crochets comme [P1] remplacent des prénoms : recopie-les exactement.",
      ].join(" "),
    },
    { role: "user" as const, content: a.document },
  ];
}

/**
 * Relit et resserre le compte rendu.
 *
 * Une relecture qui perdrait la moitié du document serait pire qu'aucune :
 * les rubriques revenues vides gardent donc leur contenu d'avant, comme au
 * rangement.
 */
export async function relireLeDocument(
  document: string,
  contexte: { genre: string; titre: string },
): Promise<string> {
  if (planVide(lirePlan(document))) return document;
  const { parts, table } = masquerTout([contexte.titre, document], await nomsDesEleves());
  const [titre, docMasque] = parts;
  const modele = await api.modeleActif(MODELE_TACHES);
  const rep = await api.mistralChat(
    promptRelecture({ genre: contexte.genre, titre, document: docMasque }), modele);
  const fusionne = fusionnerPlan(lirePlan(docMasque), lirePlan(nettoyer(rep)));
  if (planVide(fusionne)) throw new Error("La relecture n'a rien rendu d'exploitable.");
  return restaurer(ecrirePlan(fusionne), table).texte;
}

/**
 * Met au propre le compte rendu vivant, à la fin.
 *
 * Pendant la réunion, l'agent range vite et sous les yeux de l'enseignant ;
 * à la fin, on relit l'ensemble d'un coup — c'est là qu'on voit les redites
 * et l'ordre à revoir.
 */
export async function mettreAuPropre(
  reunion: Pick<Reunion, "genre" | "titre" | "date" | "participants">,
  plan: string,
): Promise<string> {
  if (planVide(lirePlan(plan))) throw new Error("Le compte rendu est encore vide.");
  const { parts, table } = masquerTout(
    [reunion.titre, reunion.participants, plan], await nomsDesEleves());
  const [titre, participants, planMasque] = parts;
  const modele = await api.modeleActif();
  const rep = await api.mistralChat(promptCompteRendu({
    genre: reunion.genre, titre, date: reunion.date, participants, resumes: planMasque,
  }), modele);
  const propre = nettoyer(rep);
  if (!propre) throw new Error("La réponse de l'IA est vide.");
  return restaurer(propre, table).texte;
}

/** Rédige le compte rendu à partir des résumés déjà obtenus. */
export async function redigerCompteRendu(
  reunion: Pick<Reunion, "genre" | "titre" | "date" | "participants">,
  liste: Resume[],
): Promise<string> {
  const utiles = liste.filter((r) => !riendedit(r.texte));
  if (!utiles.length) throw new Error("Aucun résumé à assembler.");
  const resumes = utiles.map((r) => `[${repereDuResume(r)}]\n${r.texte.trim()}`).join("\n\n");
  // Le titre et les participants partent aussi : ils se masquent avec le reste.
  const { parts, table } = masquerTout(
    [reunion.titre, reunion.participants, resumes], await nomsDesEleves());
  const [titre, participants, masque] = parts;
  const modele = await api.modeleActif();
  const rep = await api.mistralChat(promptCompteRendu({
    genre: reunion.genre, titre, date: reunion.date,
    participants, resumes: masque,
  }), modele);
  const propre = nettoyer(rep);
  if (!propre) throw new Error("La réponse de l'IA est vide.");
  return restaurer(propre, table).texte;
}

// ── Ce qu'on emporte : texte à copier, page à imprimer ────────────────────

/**
 * Le compte rendu tel qu'on le colle dans un courriel.
 *
 * À défaut de compte rendu — une réunion arrêtée avant les dix premières
 * phrases —, on emporte ce qui a été dit : mieux vaut du brut que rien.
 */
export function texteACopier(r: Reunion): string {
  const entete = [
    r.titre || r.genre || "Réunion",
    [r.genre, r.date, r.dureeS ? dureeLisible(r.dureeS) : ""].filter(Boolean).join(" · "),
    r.participants ? `Participants : ${r.participants}` : "",
  ].filter(Boolean).join("\n");
  const corps = r.compteRendu.trim() || r.texte.trim();
  return `${entete}\n\n${corps}\n`;
}

/** Le titre d'une réunion dans la liste — jamais vide. */
export function nomDeLaReunion(r: { titre: string; genre: string; date: string }): string {
  return r.titre.trim() || r.genre.trim() || "Réunion";
}
