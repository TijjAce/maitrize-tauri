// ── Le cadre d'une séance ou d'une séquence, dans l'Assistant ─────────────
//
// « Ça peut être intéressant de garder le cadre si l'utilisateur demande une
// séance ou une séquence. Il y a le mode chatbot : il y a juste à décrire, et
// répondre aux questions. Avant, ça demande si vous êtes sûr de vouloir faire une
// séquence ; tu dis oui, et hop, ça démarre » (l'enseignant, 6 novembre 2026,
// après la lecture de M2PA).
//
// M2PA n'entraîne aucun modèle : sa qualité tient à un cadre strict, des règles et
// une fiche aux cases imposées. On en reprend la méthode, avec nos mots
// (Méthode de Planification Pédagogique de l'Accessibilité, Ryckebusch, Carra et
// Cadalen, 2026 ; m2pa.forge.apps.education.fr), dans une conversation :
//   1. la demande se reconnaît ici, sans rien envoyer, et l'Assistant demande
//      confirmation ; un « non », et il répond comme d'habitude ;
//   2. il dit ce qu'il a compris et pose au plus deux questions, deux fois au plus ;
//   3. il rédige la fiche en JSON. Ce que M2PA demande au modèle se vérifie ici, par
//      le code : les huit besoins, les trois leviers, aucun diagnostic, aucune formule
//      creuse, le nombre de phrases, et chaque attendu retrouvé dans les programmes
//      (« il ne faut pas qu'il hallucine ») ; une correction est demandée, une seule ;
//   4. la fiche s'affiche, s'exporte, devient une vraie séquence, et se retouche en le
//      disant. Tout part masqué, comme le reste de l'Assistant (voir Assistant.tsx).
//
// Le parti pris de M2PA pour le socio-constructivisme n'est pas repris : l'enseignant
// dit sa démarche, sinon l'Assistant en choisit une et la nomme.

import {
  MATIERES, couleurPourMatiere, nouvelleSeance, nouvelleSequence, nowIso, type ChatMessage, type Seance, type Sequence,
} from "./api";
import { normaliser } from "./competencesTravaillees";
import { DEBUT_OBJECTIF_SEANCE } from "./demarches";
import { CHAMP_POSTURE, ecrireSeance, tableauDuDocument } from "./documentSeance";
import { CYCLE_DU_NIVEAU } from "./documentaliste";

export type SorteDePreparation = "seance" | "sequence";

const NOM: Record<SorteDePreparation, string> = { seance: "séance", sequence: "séquence" };

export interface PhaseDeLaFiche { temps: string; phase: string; enseignant: string; eleves: string; observable: string }
export interface SeanceDeLaFiche { titre: string; duree: number; objectif: string; supports: string; phases: PhaseDeLaFiche[] }
export interface AdaptationDeLaFiche { obstacle: string; besoin: string; objectifVise: string; adaptation: string; aide: string; vigilance: string }

/** La fiche, telle que le code l'a relue. */
export interface FicheDeSeance {
  titre: string; niveau: string; matiere: string; demarche: string; notion: string;
  objectifPedagogique: string; objectifApprentissage: string; prerequis: string;
  obstacles: string; criteres: string;
  /** Les attendus du programme, tous retrouvés mot pour mot dans les référentiels. */
  attendus: string[];
  seances: SeanceDeLaFiche[];
  vigilance: string;
  niveau1: { besoin: string; reponse: string }[];
  niveau2: { levier: string; reponse: string }[];
  niveau3: AdaptationDeLaFiche[];
}

/** Où en est le cadre, porté par le message : il survit au rechargement de la conversation, et ne part jamais chez Mistral. */
export type CadreDuMessage =
  | { etape: "confirmation"; sorte: SorteDePreparation }
  /** Un « oui » ou un « non » seul : rien à dire à Mistral. */
  | { etape: "reponse" }
  | { etape: "questions"; sorte: SorteDePreparation; tour: number }
  | { etape: "fiche"; sorte: SorteDePreparation; fiche: FicheDeSeance; notes: string[]; creee?: { sequenceId: string; seanceId: string } };

export const BESOINS_DU_NIVEAU_1 = [
  "Sécurisation", "Sens des apprentissages", "Sentiment de compétence", "Autonomie sociale",
  "Être acteur de ses apprentissages", "Soutien de la mémoire", "Autonomie cognitive", "Automatisation",
] as const;
export const LEVIERS_DU_NIVEAU_2 = ["Contenus", "Processus", "Productions"] as const;
/** De quoi reconnaître un besoin sous un autre libellé. */
const INDICES_DES_BESOINS = ["securi", "sens", "competen", "social", "acteur", "memoire|mnes", "cogniti", "automati"];

/** Deux tours de questions au plus : on aide, on n'interroge pas. */
export const TOURS_DE_QUESTIONS_MAX = 2;

// ── La demande ────────────────────────────────────────────────────────

const CIBLE = /\b(une?|des|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|\d+|ma prochaine|la prochaine)\s+(?:(?:petite|nouvelle|autre|courte|bonne)\s+)?(sequence|seance)s?\b/;
const INTENTION = /\b(prepar\w*|fai[st]|faire|fabriqu\w*|cre[ea]\w*|construi\w*|gener\w*|propos\w*|ecri[st]|ecrire|redig\w*|concoct\w*|mont\w*|imagin\w*|planifi\w*|organis\w*|voudrais|veux|voulais|aimerais|souhait\w*|cherch\w*|besoin|il me faut|il nous faut|donne\w*|peux-tu|pouvez-vous|pourrais-tu|aide-moi|aidez-moi)\b/;

/**
 * L'enseignant demande-t-il de préparer une séance ou une séquence ? Reconnu ici, sans rien envoyer. Un faux pas ne
 * coûte qu'une confirmation : « non », et l'Assistant répond comme d'habitude.
 */
export function demandeDePreparation(texte: string): SorteDePreparation | null {
  const t = sansHesitation(normaliser(texte));
  if (/^(qu'est-ce|c'est quoi|pourquoi|comment|combien|que veut dire|a quoi sert|quelle est|quel est|quelles sont|quels sont)\b/.test(t)) return null;
  const seule = /^(sequence|seance)s?\s+(sur|de|d'|du|des|en|pour|autour)/.exec(t);
  if (seule) return seule[1] as SorteDePreparation;
  const ma = /\bprepar\w*(?:-moi)?\s+(?:ma|la|cette)\s+(?:prochaine\s+)?(sequence|seance)\b/.exec(t);
  if (ma) return ma[1] as SorteDePreparation;
  const m = CIBLE.exec(t);
  if (!m) return null;
  // Tout de suite en tête du message, ou juste après ce qui la demande.
  if (m.index > 0 && !INTENTION.test(t.slice(Math.max(0, m.index - 60), m.index))) return null;
  const plusieurs = /^(des|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)$/.test(m[1]) || (/^\d+$/.test(m[1]) && Number(m[1]) > 1);
  return m[2] === "seance" && plusieurs ? "sequence" : (m[2] as SorteDePreparation);
}

const sansHesitation = (t: string) => t.replace(/^(?:(?:euh|heu|alors|bon|ben|bah|beh|hm+|ah|oh|mais)[,. ]+)+/, "");
const OUI = /^(oui|ouais|ouep|yes|ok|okay|d'accord|dac|daccord|vas-y|vas y|allez-y|allez|go|c'est parti|bien sur|exactement|tout a fait|absolument|volontiers|carrement|parfait|super|ca marche|on y va|c'est ca|je veux bien|s'il te plait|s'il vous plait|demarre|commence|lance|je confirme|confirme|affirmatif)\b/;
const NON = /^(non|nan|no|pas du tout|pas maintenant|pas besoin|laisse tomber|laisse|annule|stop|surtout pas|je ne veux pas|je veux pas)\b/;
const SANS_PRECISION = /^(?:merci|merci beaucoup|s'il te plait|s'il vous plait|vas-y|vas y|allez-y|on y va|c'est parti|volontiers|)$/;

/** Ce que veut dire la réponse à « Vous voulez que je prépare cette séquence ? » : la sorte peut changer en route. */
export function reponseALaConfirmation(texte: string, sorte: SorteDePreparation): { genre: "oui" | "non" | "autre"; sorte: SorteDePreparation; seule: boolean } {
  const t = sansHesitation(normaliser(texte));
  const m = OUI.exec(t) ?? NON.exec(t);
  const reste = m ? t.slice(m[0].length).replace(/[^\p{L}\p{N}' -]+/gu, " ").replace(/\s+/g, " ").trim() : t;
  const seule = !!m && SANS_PRECISION.test(reste);
  // « Non, plutôt une séance » : un oui à l'autre sorte.
  const autre: SorteDePreparation | null = sorte === "sequence" && /\bune\s+(?:seule\s+)?seance\b/.test(t) && !/\bsequence\b/.test(t) ? "seance"
    : sorte === "seance" && /\bsequence\b/.test(t) ? "sequence" : null;
  if (autre) return { genre: "oui", sorte: autre, seule: false };
  if (m && OUI.test(t)) return { genre: "oui", sorte, seule };
  if (m) return { genre: "non", sorte, seule };
  return { genre: "autre", sorte, seule: false };
}

export const questionDeConfirmation = (sorte: SorteDePreparation): string =>
  `Vous voulez que je prépare cette ${NOM[sorte]} ? Je vous poserai une ou deux questions, puis je la rédigerai.`;

const REDIGER_TOUT_DE_SUITE = /^(redige|ecris|rediger|vas-y|vas y|allez-y|commence|demarre|lance|c'est bon|ca suffit|ca ira|peu importe|je ne sais pas|je sais pas|comme tu veux|comme vous voulez)\b/;
const ABANDON = /^(laisse tomber|annule|on arrete|arrete|stop|oublie|finalement non|non finalement|on laisse)\b/;
const RETOUCHE = /\b(change|changer|modifi\w*|remplac\w*|raccourci\w*|allong\w*|ajout\w*|enleve\w*|retir\w*|supprim\w*|refai\w*|reprend\w*|reprenez|mets|mettez|mettre|passe|passez|plutot|au lieu|simplifi\w*|detaill\w*|precis\w*|reformul\w*|corrig\w*|transform\w*|adapt\w*|rends|rendez)\b/;

export type TourDuCadre =
  | { genre: "normal" }
  /** Un « non » : l'Assistant répond à la demande comme d'habitude. */
  | { genre: "decline"; seule: boolean }
  | { genre: "confirmer"; sorte: SorteDePreparation }
  | { genre: "abandon" }
  | { genre: "cadrer"; sorte: SorteDePreparation; tour: number; seule: boolean }
  | { genre: "rediger"; sorte: SorteDePreparation }
  | { genre: "retoucher"; sorte: SorteDePreparation; fiche: FicheDeSeance };

/** La fiche d'un des derniers messages, s'il y en a une : c'est d'elle qu'on parle encore. */
function ficheRecente(messages: ChatMessage[]): { sorte: SorteDePreparation; fiche: FicheDeSeance } | null {
  for (const m of messages.slice(-4).reverse()) if (m.cadre?.etape === "fiche") return { sorte: m.cadre.sorte, fiche: m.cadre.fiche };
  return null;
}

/** Ce que ce message veut dire, d'après où en est la conversation. */
export function tourDuCadre(messages: ChatMessage[], texte: string): TourDuCadre {
  const etat = [...messages].reverse().find((m) => m.role === "assistant")?.cadre;
  const t = sansHesitation(normaliser(texte));
  if (etat?.etape === "confirmation") {
    const r = reponseALaConfirmation(texte, etat.sorte);
    if (r.genre === "oui") return { genre: "cadrer", sorte: r.sorte, tour: 1, seule: r.seule };
    if (r.genre === "non") return { genre: "decline", seule: r.seule };
    // Il continue de décrire : c'est un oui. Il pose une question : elle passe d'abord.
    if (!texte.includes("?")) return { genre: "cadrer", sorte: etat.sorte, tour: 1, seule: false };
  } else if (etat?.etape === "questions") {
    if (ABANDON.test(t)) return { genre: "abandon" };
    if (REDIGER_TOUT_DE_SUITE.test(t) || etat.tour >= TOURS_DE_QUESTIONS_MAX) return { genre: "rediger", sorte: etat.sorte };
    return { genre: "cadrer", sorte: etat.sorte, tour: etat.tour + 1, seule: false };
  }
  const sorte = demandeDePreparation(texte);
  if (sorte) return { genre: "confirmer", sorte };
  const recente = ficheRecente(messages);
  if (recente && RETOUCHE.test(t)) return { genre: "retoucher", ...recente };
  return { genre: "normal" };
}

/** Un message qui a quelque chose à dire à Mistral : ni « Vous voulez que… », ni le « oui » qui lui répond. */
export const parleAMistral = (m: ChatMessage): boolean => m.cadre?.etape !== "confirmation" && m.cadre?.etape !== "reponse";

/** La conversation que le cadre envoie : les derniers échanges, sans ce qui n'y apporte rien, les longues réponses coupées. */
export function conversationDuCadre(messages: ChatMessage[], garde = 12): { role: "user" | "assistant"; content: string }[] {
  return messages
    .filter((m) => parleAMistral(m) && (m.role === "user" || m.role === "assistant") && m.content.trim())
    .slice(-garde)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.role === "assistant" && m.content.length > 1500 ? `${m.content.slice(0, 1500)}…` : m.content,
    }));
}

// ── Ce que Mistral reçoit ─────────────────────────────────────────────

export const LA_METHODE = `Tu rédiges avec la M2PA, la Méthode de Planification Pédagogique de l'Accessibilité (Ryckebusch, Carra et Cadalen, 2026) : rendre l'apprentissage accessible à tous sans toucher à ce qu'on veut qu'ils apprennent.

Ce qui ne bouge jamais.
- Tous les élèves visent le même objectif d'apprentissage, avec les mêmes critères de réussite : on change le chemin, pas l'arrivée.
- L'objectif pédagogique dit ce que l'enseignant organise (« Permettre à l'élève de… ») ; l'objectif d'apprentissage dit ce que l'élève saura faire.
- Les critères de réussite décrivent ce que l'élève parvient à faire, et qui se voit. Les obstacles possibles décrivent ce qui peut le gêner. Pas de difficulté dans les critères, pas de critère dans les obstacles.

Niveau 1, pour toute la classe : huit besoins que tous partagent, prévus d'avance. La sécurisation passe avant les autres : des repères stables, un enseignant dont les réactions se prévoient. Pour l'autonomie cognitive et l'automatisation, on guide beaucoup, puis moins, puis plus du tout, en faisant dire ses stratégies, écrire la procédure, s'entraîner.

Niveau 2, pour différencier (Cnesco, 2017), sans groupes de niveau figés :
- contenus : jouer sur la quantité, la densité, la lisibilité, la familiarité, l'organisation ou l'étayage des informations, en gardant la notion et sans livrer la réponse ;
- processus : manipuler, observer, écouter l'adulte lire, chercher à deux ou en petit groupe guidé, suivre des cartes-étapes, dire ce qu'on fait ;
- productions : montrer ce qu'on a compris à l'oral, à l'écrit, en manipulant, en pointant, en schématisant, en s'enregistrant, en dictant ; une autre façon de répondre, le même attendu.
Les aides sont provisoires, faites si possible avec les élèves, ouvertes à tous : l'enseignant y oriente ceux qui en ont besoin, et chacun garde une part de choix. Nomme le support, le geste ou l'outil de cette séance-ci : « adapter les consignes » ou « différencier selon les besoins » ne disent rien, ne les écris pas.

Niveau 3, pour un élève que quelque chose arrête encore. Des adaptations, de la plus légère à la plus forte (Millon-Fauré et Gombert, 2021) : accommodement, ajustement, adaptation parallèle, adaptation coïncidente. Prends la plus légère qui suffit. Pars toujours de ce qui fait obstacle (affectif, cognitif, psychomoteur ou social), tel qu'on le voit dans la tâche ; puis le besoin (« Besoin de … pour … ») ; l'objectif visé ; l'adaptation ; ce qu'elle aide à faire ; le point de vigilance.
- L'obstacle ne parle pas de la matière : le vocabulaire est ce qu'on apprend, l'obstacle est ce qui empêche d'y accéder (catégoriser, abstraire, mémoriser). Un prérequis non acquis n'est pas un obstacle.
- Jamais de diagnostic ni de trouble nommé : si l'enseignant en nomme un, dis ce que cela change dans la tâche.
- Adapter n'est pas simplifier : on retire ce qui empêche d'accéder, pas la difficulté de ce qu'on apprend.
- Reprends si possible une aide déjà prévue au niveau 2 : personne n'est montré du doigt.
- Une aide se retire peu à peu, sauf une compensation durable : on apprend alors à l'élève à s'en servir seul.
- Écris « étayage » et « AESH » ; ne confie rien à un ou une AESH si l'enseignant n'a pas dit qu'il y en a.
- La fiche s'imprime et se partage : elle ne nomme aucun élève, écris « un élève ».

La démarche : si l'enseignant en dit une (situation-problème, enseignement explicite, ateliers…), suis-la ; sinon, choisis celle qui convient au sujet et à ces élèves, et nomme-la.`;

const LE_FORMAT = (sorte: SorteDePreparation): string => `Réponds par un seul objet JSON, sans rien autour. Tout est en français, en texte simple, sans Markdown. Le nombre de phrases indiqué est un plafond ; une seule piste par case, la plus utile : on lit cette fiche debout, en classe.
{
  "titre": "titre court",
  "niveau": "le niveau de la classe",
  "matiere": "${MATIERES.slice(0, 13).join(" | ")}",
  "demarche": "la démarche, en quelques mots",
  "notion": "la notion précise",
  "objectif_pedagogique": "Permettre à l'élève de …",
  "objectif_apprentissage": "À la fin de cette ${NOM[sorte]}, les élèves sauront …",
  "prerequis": "ce qu'ils savent déjà",
  "obstacles_possibles": "2 phrases",
  "criteres_reussite": "2 phrases",
  "attendus": ["un attendu de la liste fournie, recopié mot pour mot ; aucun si la liste est vide ou ne convient pas"],
  "seances": [{
    "titre": "…", "duree": 45,
    "objectif": "${DEBUT_OBJECTIF_SEANCE} …",
    "supports": "le matériel, séparé par des points-virgules",
    "phases": [{ "temps": "5 min", "phase": "le nom de la phase", "enseignant": "son geste, 2 phrases", "eleves": "ce qu'ils font, 1 phrase", "observable": "ce qu'on voit, 1 phrase" }]
  }],
  "vigilance": "le point didactique à surveiller, 2 phrases",
  "niveau1": [${BESOINS_DU_NIVEAU_1.map((b) => `{ "besoin": "${b}", "reponse": "2 phrases" }`).join(", ")}],
  "niveau2": [${LEVIERS_DU_NIVEAU_2.map((l) => `{ "levier": "${l}", "reponse": "2 phrases" }`).join(", ")}],
  "niveau3": [{ "obstacle": "1 phrase", "besoin": "Besoin de … pour …", "objectif_vise": "1 phrase", "adaptation": "2 phrases", "aide": "ce qu'elle aide à faire, 1 phrase", "vigilance": "1 phrase" }]
}
${sorte === "seance"
    ? "\"seances\" a une seule entrée, de 4 à 8 phases."
    : "\"seances\" a autant d'entrées que l'enseignant en a demandé, de 4 à 6 s'il n'a rien dit, chacune de 3 à 6 phases."}
"niveau1" a exactement ces huit besoins, dans cet ordre et sous ces libellés ; "niveau2", exactement ces trois leviers.
"niveau3" : une entrée par obstacle que l'enseignant a signalé ; s'il n'en a signalé aucun, une seule, pour l'obstacle le plus prévisible dans cette tâche.`;

export interface EntreesDuCadre {
  /** Le contexte non personnel de la classe, masqué. */
  contexte?: string;
  /** Ce que l'enseignant a dit dans ses conversations d'avant, masqué. */
  memoire?: string;
  /** Les attendus du programme qui parlent de la demande. */
  programmes?: string;
  /** Le matériel que la classe possède. */
  materiel?: string;
}

const lesEntrees = (e: EntreesDuCadre): string => [
  e.contexte?.trim() && `Contexte de la classe (données non personnelles) :\n${e.contexte.trim()}`,
  e.memoire?.trim() && `Ce que l'enseignant t'a dit dans ses conversations d'avant (ce qu'il dit aujourd'hui passe avant) :\n${e.memoire.trim()}`,
  e.materiel?.trim() && `Le matériel que la classe possède ; prévois-le d'abord, et dis-le si autre chose est nécessaire :\n${e.materiel.trim()}`,
].filter(Boolean).join("\n\n");

/** Pour la question : ce qu'on a compris, et ce qui manque vraiment. */
export function consigneDesQuestions(sorte: SorteDePreparation, tour: number, e: EntreesDuCadre): string {
  const eleves = tour <= 1
    ? "S'il n'a rien dit de ses élèves, l'une de tes questions lui demande si l'un d'eux rencontre un obstacle dans ce genre de tâche : ce qu'on voit, sans prénom ni diagnostic. "
    : "";
  return [
    `Tu prépares une ${NOM[sorte]} avec un enseignant du premier degré français, et tu ne la rédiges pas encore. Pour la rédiger, il te faudrait : le niveau, la matière, le sujet précis, ce que les élèves sauront faire à la fin, ${sorte === "sequence" ? "le nombre de séances et leur durée" : "sa durée"}, ce qu'ils savent déjà, et la démarche s'il y tient.`,
    `Lis la conversation. Pose ${tour <= 1 ? "au plus deux questions" : "au plus une question"}, courtes, seulement sur ce qui changerait vraiment la fiche et que ni la conversation ni le contexte ne disent. Pour le reste, tu feras un choix que tu nommeras. ${eleves}S'il a dit assez, ne pose aucune question.`,
    `Réponds par un seul objet JSON, sans rien autour : { "compris": "une phrase qui dit ce que tu as compris", "questions": ["…"] }`,
    lesEntrees(e),
  ].filter(Boolean).join("\n\n");
}

/** Pour la rédaction : le rôle, la méthode, le format, ce qu'on sait de la classe, les programmes. */
export function consigneDeLaFiche(sorte: SorteDePreparation, e: EntreesDuCadre): string {
  return [
    `Tu es l'assistant pédagogique de Maîtrize, pour les enseignants du premier degré français (maternelle, élémentaire, établissements et services médico-sociaux). Tu rédiges une ${NOM[sorte]} d'après la conversation ; ce qu'elle ne dit pas, tu le choisis.`,
    LA_METHODE,
    lesEntrees(e),
    e.programmes?.trim() && `Attendus du programme officiel, tirés des référentiels de l'application. Quand l'un d'eux sert, recopie-le mot pour mot dans "attendus" ; n'en invente aucun.\n${e.programmes.trim()}`,
    LE_FORMAT(sorte),
  ].filter(Boolean).join("\n\n");
}

export const DEMANDE_DE_REDACTION = "Rédige la fiche maintenant, en JSON.";

/** Une fiche déjà rédigée, et ce que l'enseignant vient d'en dire. */
export function demandeDeRetouche(ficheMasquee: string, dit: string): string {
  return `Voici la fiche, en JSON :\n${ficheMasquee}\n\nL'enseignant dit : « ${dit} »\n\nS'il demande un changement, renvoie la fiche entière, changée seulement là où il le demande, au même format. Si c'est seulement une question, réponds par { "reponse": "ta réponse" }.`;
}

// ── Ce que Mistral répond ─────────────────────────────────────────────

export function lireJson(reponse: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(reponse.slice(reponse.indexOf("{"), reponse.lastIndexOf("}") + 1));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch { return null; }
}

/** Les vrais noms, dans toutes les cases : le JSON se lit d'abord, un nom qui contient un guillemet ne le casse pas. */
function rendreAvecLesNoms(v: unknown, rendre: (t: string) => string): unknown {
  if (typeof v === "string") return rendre(v);
  if (Array.isArray(v)) return v.map((x) => rendreAvecLesNoms(x, rendre));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rendreAvecLesNoms(x, rendre)]));
  return v;
}

/** Ce que dit l'Assistant pour poser ses questions, et le texte que la voix en lit. */
export function lireLesQuestions(reponse: string, rendre: (t: string) => string): { compris: string; questions: string[] } {
  const v = lireJson(reponse);
  const brut = (v ? rendreAvecLesNoms(v, rendre) : {}) as { compris?: unknown; questions?: unknown };
  return {
    compris: typeof brut.compris === "string" ? brut.compris.trim() : "",
    questions: (Array.isArray(brut.questions) ? brut.questions : []).filter((q): q is string => typeof q === "string" && !!q.trim()).map((q) => q.trim()).slice(0, 2),
  };
}

export const messageDesQuestions = (q: { compris: string; questions: string[] }): string =>
  [q.compris, q.questions.map((x) => (q.questions.length > 1 ? `- ${x}` : x)).join("\n")].filter(Boolean).join("\n\n");

/** Les phrases d'un texte : un point suivi d'une majuscule, ou la fin ; « ex. : » et « p. 12 » n'en coupent pas. */
export function phrasesDe(texte: string): string[] {
  const t = texte.replace(/\s+/g, " ").trim();
  const phrases: string[] = [];
  let debut = 0;
  for (let i = 0; i < t.length; i++) {
    if (!".!?…".includes(t[i])) continue;
    let j = i + 1;
    while (j < t.length && ".!?…»\")".includes(t[j])) j++;
    if (j < t.length && t[j] !== " ") continue;
    const suite = t.slice(j).trimStart();
    if (suite && !/^[\p{Lu}«"(\d]/u.test(suite)) continue;
    if (t[i] === "." && /(?:^|[\s(])(?:ex|p|n°|cf|etc|M|Mme)$/.test(t.slice(debut, i))) continue;
    phrases.push(t.slice(debut, j).trim());
    debut = j;
    i = j - 1;
  }
  if (t.slice(debut).trim()) phrases.push(t.slice(debut).trim());
  return phrases;
}

/** Le plafond de phrases de chaque case, tenu par le code : ce qui dépasse ne s'affiche pas. */
export const auPlus = (texte: string, n: number): string => phrasesDe(texte).slice(0, n).join(" ");

const texteDe = (v: unknown): string => (typeof v === "string" ? v.replace(/\*\*|`/g, "").replace(/\s+/g, " ").trim() : typeof v === "number" ? String(v) : "");
const listeDe = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : []);

const DIAGNOSTIC = /\b(tsa|tdah|tdh|autis\w*|asperger|dyslex\w*|dyspra\w*|dyscalcul\w*|dysortho\w*|dysphas\w*|dysgraph\w*|trisomi\w*|hyperacti\w*|epilep\w*)\b/;
const FORMULE_CREUSE = /adapter les consignes|differencier selon les besoins|selon les besoins de chacun|en fonction des besoins|adapter (?:le travail|les supports) aux besoins/;
const DIFFICULTE = /\b(difficult\w*|obstacle\w*|risque\w*|peine\w*|echoue\w*|n'arrive\w* pas)\b/;

export interface FicheLue {
  fiche: FicheDeSeance;
  /** Ce qu'il faut demander à Mistral de corriger. */
  problemes: string[];
  /** Ce que le code a déjà fait lui-même, à dire à l'enseignant. */
  notes: string[];
}

/** La durée d'une phase, comme la lit la page de la séance : « 5 min ». */
function tempsDe(v: unknown): string {
  const m = /(\d+(?:\s*[-–]\s*\d+)?)\s*(min|h|')?/i.exec(texteDe(v));
  if (!m) return "";
  return m[2]?.toLowerCase() === "h" ? `${m[1].replace(/\s+/g, "")} h` : `${m[1].replace(/\s+/g, "")} min`;
}

/**
 * La fiche relue : ce qui dépasse est coupé, les libellés remis, les attendus introuvables retirés ; ce que seul Mistral
 * peut corriger est listé. `permis` : le texte des attendus qu'on lui a donnés.
 */
export function lireFiche(v: Record<string, unknown>, sorte: SorteDePreparation, permis: string[]): FicheLue {
  const problemes: string[] = [];
  const notes: string[] = [];

  const seances: SeanceDeLaFiche[] = listeDe(v.seances).map((s, i) => ({
    titre: texteDe(s.titre) || `Séance ${i + 1}`,
    duree: Math.max(5, Math.min(240, Math.round(Number(s.duree)) || 45)),
    objectif: auPlus(texteDe(s.objectif), 2),
    supports: texteDe(s.supports),
    phases: listeDe(s.phases).map((p) => ({
      temps: tempsDe(p.temps), phase: texteDe(p.phase),
      enseignant: auPlus(texteDe(p.enseignant), 2), eleves: auPlus(texteDe(p.eleves), 2), observable: auPlus(texteDe(p.observable), 1),
    })).filter((p) => p.phase || p.enseignant || p.eleves),
  }));
  if (!seances.length) problemes.push(`Il manque "seances" : la ${NOM[sorte]} n'a aucune séance.`);
  if (sorte === "sequence" && seances.length === 1) problemes.push("Une séquence a plusieurs séances : il n'y en a qu'une.");
  seances.forEach((s, i) => { if (!s.phases.length) problemes.push(`La séance ${i + 1} n'a aucune phase.`); });

  // Les huit besoins, dans leur ordre et sous leur nom, même si le modèle les a renommés.
  const donnes = listeDe(v.niveau1);
  const niveau1 = BESOINS_DU_NIVEAU_1.map((besoin, i) => {
    const indice = new RegExp(INDICES_DES_BESOINS[i]);
    const e = donnes.find((d) => indice.test(normaliser(texteDe(d.besoin)))) ?? (donnes.length === BESOINS_DU_NIVEAU_1.length ? donnes[i] : undefined);
    return { besoin, reponse: auPlus(texteDe(e?.reponse), 2) };
  });
  const sansReponse = niveau1.filter((b) => !b.reponse).map((b) => b.besoin);
  if (sansReponse.length) problemes.push(`Au niveau 1, il manque une réponse pour : ${sansReponse.join(", ")}.`);

  const leviers = listeDe(v.niveau2);
  const niveau2 = LEVIERS_DU_NIVEAU_2.map((levier, i) => {
    const e = leviers.find((d) => normaliser(texteDe(d.levier)).includes(normaliser(levier).slice(0, 5))) ?? (leviers.length === LEVIERS_DU_NIVEAU_2.length ? leviers[i] : undefined);
    return { levier, reponse: auPlus(texteDe(e?.reponse), 2) };
  });
  const sansLevier = niveau2.filter((l) => !l.reponse).map((l) => l.levier);
  if (sansLevier.length) problemes.push(`Au niveau 2, il manque une réponse pour : ${sansLevier.join(", ")}.`);
  if (niveau2.some((l) => FORMULE_CREUSE.test(normaliser(l.reponse)))) {
    problemes.push("Au niveau 2, une réponse tient en une formule creuse : nomme le support, le geste ou l'outil de cette séance.");
  }

  const niveau3: AdaptationDeLaFiche[] = listeDe(v.niveau3).map((a) => ({
    obstacle: auPlus(texteDe(a.obstacle), 1), besoin: auPlus(texteDe(a.besoin), 1), objectifVise: auPlus(texteDe(a.objectif_vise), 1),
    adaptation: auPlus(texteDe(a.adaptation), 2), aide: auPlus(texteDe(a.aide), 1), vigilance: auPlus(texteDe(a.vigilance), 1),
  })).filter((a) => a.obstacle || a.adaptation).slice(0, 8);
  const nommes = [...new Set(niveau3.flatMap((a) => normaliser(`${a.obstacle} ${a.besoin} ${a.adaptation}`).match(new RegExp(DIAGNOSTIC.source, "g")) ?? []))];
  if (nommes.length) problemes.push(`Le niveau 3 nomme un diagnostic (${nommes.join(", ")}) : pars de l'obstacle, tel qu'on le voit dans la tâche.`);

  const criteres = auPlus(texteDe(v.criteres_reussite), 2);
  if (DIFFICULTE.test(normaliser(criteres))) {
    problemes.push("Les critères de réussite parlent de difficultés : ils disent seulement ce que l'élève parvient à faire ; les difficultés vont dans les obstacles possibles.");
  }

  // Un attendu du programme se retrouve mot pour mot, ou il s'en va : « il ne faut pas qu'il hallucine ».
  const connus = permis.map(normaliser);
  const donnesAttendus = (Array.isArray(v.attendus) ? v.attendus : []).map(texteDe).filter(Boolean);
  // Quatre mots au moins : deux lettres se retrouvent partout, et ne prouvent rien.
  const attendus = donnesAttendus.filter((a) => {
    const propre = normaliser(a).replace(/^[«"\s]+|[»"\s.]+$/g, "");
    return propre.split(" ").length >= 4 && connus.some((c) => c.includes(propre));
  });
  const retires = donnesAttendus.length - attendus.length;
  if (retires) notes.push(retires > 1 ? `${retires} attendus du programme retirés : introuvables dans les référentiels.` : "Un attendu du programme retiré : introuvable dans les référentiels.");

  const fiche: FicheDeSeance = {
    titre: texteDe(v.titre) || seances[0]?.titre || NOM[sorte],
    niveau: texteDe(v.niveau), matiere: texteDe(v.matiere), demarche: texteDe(v.demarche), notion: texteDe(v.notion),
    objectifPedagogique: auPlus(texteDe(v.objectif_pedagogique), 2), objectifApprentissage: auPlus(texteDe(v.objectif_apprentissage), 2),
    prerequis: auPlus(texteDe(v.prerequis), 2), obstacles: auPlus(texteDe(v.obstacles_possibles), 2), criteres, attendus,
    seances, vigilance: auPlus(texteDe(v.vigilance), 2), niveau1, niveau2, niveau3,
  };
  return { fiche, problemes, notes };
}

/** Rédige la fiche : le modèle écrit, le code relit, une correction si besoin, une seule. `reponse` : on lui a seulement posé une question. */
export async function redigerLaFiche(o: {
  sorte: SorteDePreparation;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  permis: string[];
  appeler: (messages: { role: "system" | "user" | "assistant"; content: string }[]) => Promise<string>;
  rendre: (t: string) => string;
  surCorrection?: () => void;
}): Promise<{ fiche: FicheDeSeance; notes: string[] } | { reponse: string }> {
  const lire = (rep: string): FicheLue | { reponse: string } | null => {
    const v = lireJson(rep);
    if (!v) return null;
    const avecNoms = rendreAvecLesNoms(v, o.rendre) as Record<string, unknown>;
    if (typeof avecNoms.reponse === "string" && !Array.isArray(avecNoms.seances)) return { reponse: avecNoms.reponse };
    const lue = lireFiche(avecNoms, o.sorte, o.permis);
    // Un marqueur de personne : la fiche nomme un élève, et elle s'imprime, elle se partage.
    return /\[P\d+\]/.test(rep) ? { ...lue, problemes: [...lue.problemes, "La fiche nomme un élève : écris « un élève », sans prénom."] } : lue;
  };
  const premiere = await o.appeler(o.messages);
  const lue = lire(premiere);
  if (lue && "reponse" in lue) return lue;
  if (lue && !lue.problemes.length) return { fiche: lue.fiche, notes: lue.notes };

  o.surCorrection?.();
  const aCorriger = lue?.problemes ?? ["Ta réponse n'était pas un objet JSON valide."];
  const seconde = await o.appeler([
    ...o.messages,
    { role: "assistant", content: premiere },
    { role: "user", content: `Corrige seulement ceci, et renvoie la fiche entière en JSON :\n${aCorriger.map((p) => `- ${p}`).join("\n")}` },
  ]);
  const corrigee = lire(seconde);
  const finale = corrigee && !("reponse" in corrigee) ? corrigee : lue;
  if (!finale || "reponse" in finale || !finale.fiche.seances.some((s) => s.phases.length)) {
    throw new Error(`la fiche n'a pas pu être rédigée (${NOM[o.sorte]} sans déroulé ou réponse illisible). Réessayez.`);
  }
  return { fiche: finale.fiche, notes: [...finale.notes, ...finale.problemes] };
}

// ── Ce qu'on en fait ──────────────────────────────────────────────────

/** Une case de tableau : ni barre, ni retour à la ligne. */
const enCase = (t: string) => (t || "—").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
const ligneDeTableau = (cases: string[]) => `| ${cases.map(enCase).join(" | ")} |`;
const entete = (cases: string[]) => [ligneDeTableau(cases), `| ${cases.map(() => "---").join(" | ")} |`].join("\n");

/** La fiche, à lire dans la conversation, à imprimer, à exporter. */
export function ficheEnMarkdown(f: FicheDeSeance, sorte: SorteDePreparation): string {
  const champ = (nom: string, t: string) => (t ? `**${nom} :** ${t}` : "");
  const duree = sorte === "sequence" ? `${f.seances.length} séances` : `${f.seances[0]?.duree ?? 45} min`;
  const parties: string[] = [
    `# ${f.titre}`,
    [f.niveau, f.matiere, duree, f.demarche].filter(Boolean).join(" · "),
    [
      champ("Notion", f.notion), champ("Objectif pédagogique", f.objectifPedagogique), champ("Objectif d'apprentissage", f.objectifApprentissage),
      champ("Prérequis", f.prerequis), champ("Obstacles possibles", f.obstacles), champ("Critères de réussite", f.criteres),
    ].filter(Boolean).join("\n\n"),
  ];
  if (f.attendus.length) parties.push(`**Attendus du programme :**\n${f.attendus.map((a) => `- « ${a.replace(/^[«"\s]+|[»"\s]+$/g, "")} »`).join("\n")}`);
  f.seances.forEach((s, i) => {
    parties.push(
      `## ${sorte === "sequence" ? `Séance ${i + 1} : ${s.titre}` : "Le déroulé"} (${s.duree} min)`,
      [champ("Objectif", s.objectif), champ("Supports", s.supports)].filter(Boolean).join("\n\n"),
      [entete(["Temps", "Phase", "L'enseignant", "Les élèves", "Ce qu'on observe"]), ...s.phases.map((p) => ligneDeTableau([p.temps, p.phase, p.enseignant, p.eleves, p.observable]))].join("\n"),
    );
  });
  if (f.vigilance) parties.push(champ("Vigilance", f.vigilance));
  parties.push("## Niveau 1 : ce dont tous les élèves ont besoin", [entete(["Besoin", "Ce qui est prévu"]), ...f.niveau1.map((b) => ligneDeTableau([b.besoin, b.reponse]))].join("\n"));
  parties.push("## Niveau 2 : différencier", [entete(["Levier", "Ce qui est prévu"]), ...f.niveau2.map((l) => ligneDeTableau([l.levier, l.reponse]))].join("\n"));
  if (f.niveau3.length) {
    parties.push("## Niveau 3 : pour un élève qu'un obstacle arrête encore");
    for (const a of f.niveau3) {
      parties.push([
        `**${a.obstacle || "Obstacle"}**`,
        ...(a.besoin ? [`- ${/^besoin\b/i.test(a.besoin) ? a.besoin : `Besoin : ${a.besoin}`}`] : []),
        ...[["Objectif visé", a.objectifVise], ["Adaptation", a.adaptation], ["Ce qu'elle aide à faire", a.aide], ["Vigilance", a.vigilance]]
          .filter(([, t]) => t).map(([n, t]) => `- ${n} : ${t}`),
      ].join("\n"));
    }
  }
  parties.push("_D'après la méthode M2PA (Ryckebusch, Carra et Cadalen, 2026)._");
  return parties.filter(Boolean).join("\n\n");
}

const CYCLES_DES_NIVEAUX: Record<number, string> = { 1: "Cycle 1", 2: "Cycle 2", 3: "Cycle 3" };

/** La matière de la fiche, parmi celles de l'application ; rien si elle n'y est pas. */
export function matiereDeLaFiche(matiere: string): string {
  const m = normaliser(matiere);
  return MATIERES.find((x) => normaliser(x) === m) ?? MATIERES.find((x) => m && (normaliser(x).includes(m) || m.includes(normaliser(x)))) ?? "";
}

/** La séquence qui accueille la fiche : le niveau s'il est connu de l'application, et de là le cycle. */
export function sequenceDeLaFiche(f: FicheDeSeance, periode: number): Sequence {
  const matiere = matiereDeLaFiche(f.matiere);
  const niveau = normaliser(f.niveau);
  const cycle = CYCLE_DU_NIVEAU[niveau];
  return {
    ...nouvelleSequence(), titre: f.titre, matiere, cycle: cycle ? CYCLES_DES_NIVEAUX[cycle] : "", niveau: cycle ? f.niveau : "",
    objectifs: f.objectifApprentissage, couleur: matiere ? couleurPourMatiere(matiere) : "blue",
    periode, nbSeancesPrevu: f.seances.length, dateMaj: nowIso(),
  };
}

/** Les séances de la fiche, pour la page d'une séance : ses phases en cartes, le geste de l'enseignant dans sa posture. */
export function seancesDeLaFiche(f: FicheDeSeance, sequenceId: string, depuis = 1): Seance[] {
  return f.seances.map((s, i) => {
    const deroulement = ecrireSeance({
      intro: "",
      phases: s.phases.map((p) => ({
        titre: p.phase, duree: p.temps, deroulement: p.eleves,
        champs: [{ nom: CHAMP_POSTURE, texte: p.enseignant }, ...(p.observable ? [{ nom: "Ce qu'on observe", texte: p.observable }] : [])],
      })),
    });
    return {
      ...nouvelleSeance(sequenceId, depuis + i), titre: s.titre, objectifs: s.objectif, materiel: s.supports, duree: s.duree,
      deroulement, tableauDeroulement: JSON.stringify(tableauDuDocument(deroulement) ?? []), dateMaj: nowIso(),
    };
  });
}

/** Ce que la voix dit quand la fiche est là : une fiche ne se lit pas à voix haute. */
export const FICHE_PRETE = "C'est prêt, la fiche est à l'écran. Dites-moi ce qu'il faut changer, ou créez-la dans Maitrize.";
