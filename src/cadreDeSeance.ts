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
//   2. il mène un entretien, une question à la fois, et le code tient la liste de ce
//      qui manque : pas de rédaction sans le sujet, l'objectif, la durée… sauf si
//      l'enseignant le demande. Chez M2PA, deux questions suffisent parce qu'un
//      formulaire a tout demandé avant ; ici, il n'y en a pas (« pourquoi il m'a pas
//      posé plus de questions », le premier essai, 6 novembre). Pour un élève, les
//      quatre temps de M2PA : ce qu'on voit, ailleurs, ce qui aide, puis des hypothèses
//      de besoin à choisir ; un récapitulatif avant de rédiger ;
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
export interface AdaptationDeLaFiche {
  domaine: string; obstacle: string; manifestation: string; besoin: string; objectifVise: string; degre: string; adaptation: string; aide: string; vigilance: string;
}

/** Ce qu'on sait d'un élève signalé, sans prénom ni diagnostic : les quatre temps de M2PA. */
export interface EleveDuCadre { vu?: string; ailleurs?: string; appuis?: string; besoin?: string }

/** Ce que l'entretien a établi : ce que l'enseignant a dit ou accepté ; « à choisir » s'il s'en remet à l'Assistant. */
export interface ConnuDuCadre {
  niveau?: string; matiere?: string; sujet?: string; objectif?: string; criteres?: string;
  nb_seances?: string; place?: string; duree?: string; prerequis?: string;
  support?: string; demarche?: string; organisation?: string;
  eleves_signales?: string; eleves?: EleveDuCadre[]; autre_eleve?: string;
}

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
  | { etape: "questions"; sorte: SorteDePreparation; tour: number; connu?: ConnuDuCadre; posees?: Record<string, number> }
  /** Tout est là : « Si j'ai bien compris… Je rédige ? » */
  | { etape: "recap"; sorte: SorteDePreparation; tour: number; connu: ConnuDuCadre; posees: Record<string, number> }
  | { etape: "fiche"; sorte: SorteDePreparation; fiche: FicheDeSeance; notes: string[]; creee?: { sequenceId: string; seanceId: string } };

export const BESOINS_DU_NIVEAU_1 = [
  "Sécurisation", "Sens des apprentissages", "Sentiment de compétence", "Autonomie sociale",
  "Être acteur de ses apprentissages", "Soutien de la mémoire", "Autonomie cognitive", "Automatisation",
] as const;
export const LEVIERS_DU_NIVEAU_2 = ["Contenus", "Processus", "Productions"] as const;
/** De quoi reconnaître un besoin sous un autre libellé. */
const INDICES_DES_BESOINS = ["securi", "sens", "competen", "social", "acteur", "memoire|mnes", "cogniti", "automati"];

/** Au-delà, il rédige avec ce qu'il a : un garde-fou, pas un objectif ; « rédige » suffit à tout moment. */
export const TOURS_DE_QUESTIONS_MAX = 24;
/** Une question restée sans réponse deux fois n'est plus posée : le modèle choisira, et la fiche le dira. */
const FOIS_PAR_QUESTION = 2;
/** Comme M2PA : huit élèves au plus. */
const ELEVES_MAX = 8;

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
  `Vous voulez que je prépare cette ${NOM[sorte]} ? Je vous pose quelques questions, puis je la rédige.`;

// « Vas-y » répond à une proposition, « je ne sais pas » à une question : seul un ordre clair arrête l'entretien.
const REDIGER_TOUT_DE_SUITE = /^(redige|redigez|rediger|ecris la|ecrivez la|passe a la redaction|passons a la redaction|c'est bon|ca suffit|ca ira|tu peux rediger|vous pouvez rediger|tu peux y aller|lance la redaction)\b/;
const ABANDON = /^(laisse tomber|annule|on arrete|arrete|stop|oublie|finalement non|non finalement|on laisse)\b/;
const RETOUCHE = /\b(change|changer|modifi\w*|remplac\w*|raccourci\w*|allong\w*|ajout\w*|enleve\w*|retir\w*|supprim\w*|refai\w*|reprend\w*|reprenez|mets|mettez|mettre|passe|passez|plutot|au lieu|simplifi\w*|detaill\w*|precis\w*|reformul\w*|corrig\w*|transform\w*|adapt\w*|rends|rendez)\b/;

export type TourDuCadre =
  | { genre: "normal" }
  /** Un « non » : l'Assistant répond à la demande comme d'habitude. */
  | { genre: "decline"; seule: boolean }
  | { genre: "confirmer"; sorte: SorteDePreparation }
  | { genre: "abandon" }
  | { genre: "cadrer"; sorte: SorteDePreparation; tour: number; seule: boolean; connu: ConnuDuCadre; posees: Record<string, number> }
  | { genre: "rediger"; sorte: SorteDePreparation; connu: ConnuDuCadre }
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
    if (r.genre === "oui") return { genre: "cadrer", sorte: r.sorte, tour: 1, seule: r.seule, connu: {}, posees: {} };
    if (r.genre === "non") return { genre: "decline", seule: r.seule };
    // Il continue de décrire : c'est un oui. Il pose une question : elle passe d'abord.
    if (!texte.includes("?")) return { genre: "cadrer", sorte: etat.sorte, tour: 1, seule: false, connu: {}, posees: {} };
  } else if (etat?.etape === "questions" || etat?.etape === "recap") {
    const connu = etat.connu ?? {};
    if (ABANDON.test(t)) return { genre: "abandon" };
    if (REDIGER_TOUT_DE_SUITE.test(t) || etat.tour >= TOURS_DE_QUESTIONS_MAX) return { genre: "rediger", sorte: etat.sorte, connu };
    if (etat.etape === "recap") {
      const r = reponseALaConfirmation(texte, etat.sorte);
      if (r.genre === "oui" && r.seule) return { genre: "rediger", sorte: etat.sorte, connu };
    }
    return { genre: "cadrer", sorte: etat.sorte, tour: etat.tour + 1, seule: false, connu, posees: etat.posees ?? {} };
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
export function conversationDuCadre(messages: ChatMessage[], garde = 16): { role: "user" | "assistant"; content: string }[] {
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

Niveau 1, pour toute la classe : huit besoins que tous partagent, prévus d'avance. La sécurisation passe avant les autres : des repères stables, un enseignant dont les réactions se prévoient. Pour l'autonomie cognitive et l'automatisation, on guide beaucoup, puis moins, puis plus du tout, en faisant dire ses stratégies, écrire la procédure, s'entraîner. Chaque réponse nomme ce qui est prévu dans cette séance-ci : un rituel, un affichage, un geste précis ; « féliciter » ou « encourager » n'en sont pas.

Niveau 2, pour différencier (Cnesco, 2017), sans groupes de niveau figés :
- contenus : jouer sur la quantité, la densité, la lisibilité, la familiarité, l'organisation ou l'étayage des informations, en gardant la notion et sans livrer la réponse ;
- processus : manipuler, observer, écouter l'adulte lire, chercher à deux ou en petit groupe guidé, suivre des cartes-étapes, dire ce qu'on fait ;
- productions : montrer ce qu'on a compris à l'oral, à l'écrit, en manipulant, en pointant, en schématisant, en s'enregistrant, en dictant ; une autre façon de répondre, le même attendu.
Les aides sont provisoires, faites si possible avec les élèves, ouvertes à tous : l'enseignant y oriente ceux qui en ont besoin, et chacun garde une part de choix. Nomme le support, le geste ou l'outil de cette séance-ci : « adapter les consignes » ou « différencier selon les besoins » ne disent rien, ne les écris pas.

Niveau 3, pour un élève que quelque chose arrête encore. Des adaptations, de la plus légère à la plus forte (Millon-Fauré et Gombert, 2021) : accommodement, ajustement, adaptation parallèle, adaptation coïncidente. Prends la plus légère qui suffit. Pars toujours de ce qui fait obstacle, puis le besoin (« Besoin de … pour … »), l'objectif visé, l'adaptation, ce qu'elle aide à faire, le point de vigilance.
- Quatre domaines : psychomoteur (coordination, motricité fine, fatigue, espace, geste), affectif (insécurité, peur de l'erreur, sentiment de compétence), social (relations, demander de l'aide, coopérer), cognitif (mémoire de travail, attention, planification, abstraction, autorégulation).
- Des obstacles qui reviennent : abstraire ou conceptualiser ; rester attentif, se retenir, se réguler ; supporter la frustration, l'erreur, l'attente ; accéder à l'écrit ; comprendre l'implicite et ce qui est attendu ; planifier, traiter les informations ; garder en mémoire de travail ; dire ou justifier ; le geste, la motricité, la fatigue ; produire long.
- L'obstacle ne parle pas de la matière : le vocabulaire est ce qu'on apprend, l'obstacle est ce qui empêche d'y accéder (catégoriser, abstraire, mémoriser). Le disciplinaire va dans ce qu'on en voit dans la tâche et dans l'objectif visé. Un prérequis non acquis n'est pas un obstacle.
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
  "niveau3": [{ "domaine": "psychomoteur | affectif | social | cognitif", "obstacle": "l'obstacle, sans rien de la matière, 1 phrase", "manifestation": "ce qu'on en voit dans cette tâche, 1 phrase", "besoin": "Besoin de … pour …", "objectif_vise": "1 phrase", "degre": "accommodement | ajustement | adaptation parallèle | adaptation coïncidente", "adaptation": "2 phrases", "aide": "ce qu'elle aide à faire, 1 phrase", "vigilance": "1 phrase" }]
}
${sorte === "seance"
    ? "\"seances\" a une seule entrée, de 4 à 8 phases."
    : "\"seances\" a autant d'entrées que l'enseignant en a demandé, de 4 à 6 s'il n'a rien dit, chacune de 3 à 6 phases."}
"niveau1" a exactement ces huit besoins, dans cet ordre et sous ces libellés ; "niveau2", exactement ces trois leviers.
"niveau3" : une entrée par élève signalé, qui reprend le besoin retenu ; si aucun n'est signalé, une seule, pour l'obstacle le plus prévisible dans cette tâche.`;

export interface EntreesDuCadre {
  /** Ce que l'entretien a établi, masqué : à respecter tel quel. */
  etabli?: string;
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

/** La liste de ce qu'il faut savoir, pour le modèle : elle suit l'ordre des questions. */
const CE_QU_IL_FAUT_SAVOIR = (sorte: SorteDePreparation) => `- niveau : le niveau de la classe ;
- matiere et sujet : la matière, puis ce qu'on y travaille précisément (« les mathématiques » ne dit pas le sujet) ;
- objectif : ce que les élèves sauront faire à la fin, à l'infinitif ;
- criteres : ce qui montrera qu'ils ont réussi, et qui se voit ;
${sorte === "sequence" ? "- nb_seances et duree : combien de séances, et combien de temps chacune ;" : "- place et duree : où elle vient dans la séquence, et combien de temps elle dure ;"}
- prerequis : où ils en sont aujourd'hui, ce qu'ils savent déjà faire ;
- support : l'activité ou le matériel qu'il a en tête ;
- demarche : situation-problème, enseignement explicite, ateliers… ;
- organisation : combien d'élèves, des groupes, un autre adulte présent (AESH, ATSEM) ;
- eleves_signales : "oui" ou "non" : un élève rencontre-t-il un obstacle dans ce genre de tâche ?

Pour chaque élève signalé, une entrée dans "eleves", sans prénom ni diagnostic ; s'il en nomme un, demande ce que cela donne dans la tâche :
- vu : ce qu'on voit exactement pendant la tâche, sans interpréter ;
- ailleurs : si cela arrive à d'autres moments de la journée (le corps, les émotions, les relations, la mémoire, l'attention) ;
- appuis : ce qu'il réussit, ce qui l'aide déjà ;
- besoin : propose deux ou trois hypothèses, en une phrase chacune, sous la forme « Besoin de … pour … », jamais un diagnostic ni un mot médical, et demande laquelle lui parle ; si ce qu'il a vu reste trop vague, une seule hypothèse prudente, et conseille d'observer encore ou d'en parler à un collègue spécialisé ;
puis autre_eleve : "oui" ou "non" : y a-t-il un autre élève à prévoir ?`;

/** L'entretien : ce que le modèle doit relever, et la question qu'il doit poser. */
export function consigneDeLEntretien(sorte: SorteDePreparation, connuMasque: string, e: EntreesDuCadre): string {
  return [
    `Tu prépares une ${NOM[sorte]} avec un enseignant du premier degré français, comme un conseiller pédagogique attentif. Tu ne la rédiges pas encore : tu mènes l'entretien qui permettra de la rédiger.`,
    `Comment tu parles. Tu le vouvoies. Une seule question à la fois, une ou deux phrases, comme à l'oral : ni résumé de ce qu'il vient de dire, ni liste de ce qui manque. Deux informations qui vont ensemble peuvent se demander d'un coup (la matière et le sujet, l'objectif et les critères, le nombre de séances et leur durée). Quand tu le peux, propose au lieu de demander (« Je propose … : ça vous va ? »), d'après les attendus du programme, le matériel de la classe et ce qu'il a déjà dit : pour lui, cela va plus vite. Si un mot veut dire deux choses dans le métier et que cela change la ${NOM[sorte]} (numération ou calcul, son ou graphème, vocabulaire ou lexique), demande lequel.`,
    `Ce qu'il te faut savoir, dans cet ordre. Tu poses la question de la première information qui manque :\n${CE_QU_IL_FAUT_SAVOIR(sorte)}`,
    `Réponds par un seul objet JSON, sans rien autour :
{ "connu": { "niveau": "", "matiere": "", "sujet": "", "objectif": "", "criteres": "", ${sorte === "sequence" ? '"nb_seances": "", ' : '"place": "", '}"duree": "", "prerequis": "", "support": "", "demarche": "", "organisation": "", "eleves_signales": "", "eleves": [{ "vu": "", "ailleurs": "", "appuis": "", "besoin": "" }], "autre_eleve": "" }, "cible": "la clé de ta question", "question": "ta question" }
"connu" contient tout ce qui est établi : ce qu'il a dit ou accepté, jamais ce que tu proposes et qu'il n'a pas encore accepté. Ce qu'il n'a pas dit reste vide. S'il répond qu'il ne sait pas, ou que cela lui est égal, écris « à choisir ». Quand tout est établi, "cible" et "question" sont vides.`,
    `Ce qui est déjà établi :\n${connuMasque}`,
    lesEntrees(e),
    e.programmes?.trim() && `Attendus du programme officiel, tirés des référentiels de l'application, pour proposer l'objectif ; n'en invente aucun :\n${e.programmes.trim()}`,
  ].filter(Boolean).join("\n\n");
}

/** Pour la rédaction : le rôle, la méthode, le format, ce qu'on sait de la classe, les programmes. */
export function consigneDeLaFiche(sorte: SorteDePreparation, e: EntreesDuCadre): string {
  return [
    `Tu es l'assistant pédagogique de Maîtrize, pour les enseignants du premier degré français (maternelle, élémentaire, établissements et services médico-sociaux). Tu rédiges une ${NOM[sorte]} d'après la conversation ; ce qu'elle ne dit pas, tu le choisis.`,
    LA_METHODE,
    e.etabli?.trim() && `Ce que l'enseignant a établi, à respecter tel quel, prérequis compris ; ce qui n'y est pas, ou « à choisir », choisis-le et nomme ton choix :\n${e.etabli.trim()}`,
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

/** Ce qui ne dit rien : un modèle remplit parfois une case de « non précisé » plutôt que de la laisser vide. */
const RIEN_DE_DIT = /^(?:|\?+|-+|n\/?a|non|inconnue?s?|aucune?|ind[eé]termin[eé]e?s?|non (?:pr[eé]cis[eé]e?s?|renseign[eé]e?s?|d[eé]fini?e?s?|sp[eé]cifi[eé]e?s?|indiqu[eé]e?s?|communiqu[eé]e?s?)|[àa] pr[eé]ciser|[àa] d[eé]finir|[àa] d[eé]terminer|pas (?:encore )?(?:pr[eé]cis[eé]e?s?|dit))$/i;
export const A_CHOISIR = "à choisir";

const valeurDe = (v: unknown): string => {
  const t = texteDe(v);
  return RIEN_DE_DIT.test(t) ? "" : t;
};

export interface EntretienLu { connu: ConnuDuCadre; cible: string; question: string }

const CLES_SIMPLES = ["niveau", "matiere", "sujet", "objectif", "criteres", "nb_seances", "place", "duree", "prerequis", "support", "demarche", "organisation", "eleves_signales", "autre_eleve"] as const;

/** Ce que le modèle a relevé et la question qu'il pose ; rien d'illisible ne bloque : le code connaît ses questions. */
export function lireLEntretien(reponse: string, rendre: (t: string) => string): EntretienLu {
  const v = lireJson(reponse);
  const brut = (v ? rendreAvecLesNoms(v, rendre) : {}) as Record<string, unknown>;
  const c = (brut.connu && typeof brut.connu === "object" ? brut.connu : {}) as Record<string, unknown>;
  const connu: ConnuDuCadre = {};
  for (const cle of CLES_SIMPLES) { const t = valeurDe(c[cle]); if (t) connu[cle] = t; }
  // « non » veut dire quelque chose ici : personne à prévoir.
  for (const cle of ["eleves_signales", "autre_eleve"] as const) if (/^non\b/i.test(texteDe(c[cle]))) connu[cle] = "non";
  const eleves = listeDe(c.eleves).map((e): EleveDuCadre => {
    const sortie: EleveDuCadre = {};
    for (const cle of ["vu", "ailleurs", "appuis", "besoin"] as const) { const t = cle === "ailleurs" ? texteDe(e[cle]) : valeurDe(e[cle]); if (t) sortie[cle] = t; }
    return sortie;
  }).filter((e) => Object.keys(e).length);
  if (eleves.length) connu.eleves = eleves;
  // « eleves[0].vu », « matiere et sujet » : le dernier mot dit la clé.
  return { connu, cible: texteDe(brut.cible).split(/[^\p{L}_]+/u).filter(Boolean).pop() ?? "", question: texteDe(brut.question) };
}

/** Ce qui a été établi n'est jamais perdu : le modèle peut oublier une case d'un tour à l'autre. */
export function fusionnerLeConnu(avant: ConnuDuCadre, nouveau: ConnuDuCadre): ConnuDuCadre {
  const suite: ConnuDuCadre = { ...avant, ...nouveau };
  const longueur = Math.max(avant.eleves?.length ?? 0, nouveau.eleves?.length ?? 0);
  if (longueur) suite.eleves = Array.from({ length: Math.min(longueur, ELEVES_MAX) }, (_, i) => ({ ...avant.eleves?.[i], ...nouveau.eleves?.[i] }));
  // Un nouvel élève : la question d'un suivant se reposera après lui.
  if ((nouveau.eleves?.length ?? 0) > (avant.eleves?.length ?? 0) && avant.autre_eleve && !/^non\b/i.test(avant.autre_eleve)) delete suite.autre_eleve;
  return suite;
}

const NOMBRES_EN_LETTRES: Record<string, string[]> = {
  1: ["une", "un"], 2: ["deux"], 3: ["trois"], 4: ["quatre"], 5: ["cinq"], 6: ["six"], 7: ["sept"], 8: ["huit"], 9: ["neuf"], 10: ["dix"], 11: ["onze"], 12: ["douze"],
  15: ["quinze", "quart d'heure"], 20: ["vingt"], 25: ["vingt-cinq"], 30: ["trente", "demi-heure"], 35: ["trente-cinq"], 40: ["quarante"], 45: ["quarante-cinq", "trois quarts d'heure"],
  50: ["cinquante"], 55: ["cinquante-cinq"], 60: ["soixante", "une heure"], 90: ["quatre-vingt-dix", "heure et demie"],
};
const MOTS_VIDES = new Set(["les", "des", "une", "aux", "sur", "par", "pour", "dans", "avec", "qui", "que", "est", "son", "ses", "mes", "nos", "vos", "leur", "leurs", "ils", "elles", "tout", "tous", "chaque", "seance", "seances", "min", "minute", "minutes", "heure", "heures"]);
const motsDe = (t: string) => normaliser(t).replace(/[^\p{L}\p{N} ]/gu, " ").split(" ").filter((m) => m.length >= 3 || /\d/.test(m));

/** L'enseignant l'a-t-il dit, ou accepté une proposition qui le disait ? Un modèle remplit volontiers le sujet tout seul. */
function ditParLEnseignant(valeur: string, conversation: ChatMessage[]): boolean {
  if (valeur === A_CHOISIR) return true;
  const dits: string[] = [];
  conversation.forEach((m, i) => {
    if (m.role !== "user") return;
    dits.push(m.content);
    const avant = conversation[i - 1];
    if (avant?.role === "assistant" && OUI.test(sansHesitation(normaliser(m.content)))) dits.push(avant.content);
  });
  const texte = normaliser(dits.join(" "));
  // « les » se trouve partout : seuls les mots qui disent quelque chose comptent. Un nombre se dit souvent en toutes lettres.
  const mots = motsDe(valeur).filter((m) => !MOTS_VIDES.has(m));
  return !mots.length || mots.some((m) => (/^\d+$/.test(m)
    ? new RegExp(`\\b(?:${[m, ...(NOMBRES_EN_LETTRES[m] ?? [])].join("|")})\\b`).test(texte)
    : texte.includes(/\d/.test(m) ? m : m.slice(0, 5))));
}

/** Le connu relu : le sujet n'est pas la matière, et un chiffre ou un sujet que personne n'a dit ne tient pas. */
export function relireLeConnu(connu: ConnuDuCadre, conversation: ChatMessage[]): ConnuDuCadre {
  const suite = { ...connu };
  const sujet = normaliser(suite.sujet ?? "").replace(/^(?:les?|la|l'|des?)\s*/, "");
  if (sujet && (MATIERES.some((m) => normaliser(m) === sujet) || sujet === normaliser(suite.matiere ?? "") || /^(?:maths?|mathematiques?|francais|sciences?)$/.test(sujet))) delete suite.sujet;
  for (const cle of ["sujet", "nb_seances", "duree", "prerequis"] as const) {
    const v = suite[cle];
    if (v && !ditParLEnseignant(v, conversation)) delete suite[cle];
  }
  return suite;
}

const QUESTIONS_DE_LA_CLASSE: { cle: (typeof CLES_SIMPLES)[number]; texte: string; seulement?: SorteDePreparation; groupe?: string }[] = [
  { cle: "niveau", texte: "Pour quel niveau ?" },
  { cle: "matiere", texte: "Dans quelle matière ?", groupe: "sujet" },
  { cle: "sujet", texte: "Sur quoi précisément ?", groupe: "sujet" },
  { cle: "objectif", texte: "À la fin, qu'est-ce que les élèves sauront faire ?", groupe: "objectif" },
  { cle: "criteres", texte: "À quoi verrez-vous qu'ils ont réussi ?", groupe: "objectif" },
  { cle: "nb_seances", seulement: "sequence", texte: "Combien de séances voulez-vous ?", groupe: "temps" },
  { cle: "place", seulement: "seance", texte: "À quel moment de la séquence vient cette séance ?", groupe: "temps" },
  { cle: "duree", texte: "Combien de temps dure une séance ?", groupe: "temps" },
  { cle: "prerequis", texte: "Où en sont-ils aujourd'hui : qu'est-ce qu'ils savent déjà faire ?" },
  { cle: "support", texte: "Avez-vous une activité ou un support en tête ?" },
  { cle: "demarche", texte: "Une démarche à privilégier : situation-problème, enseignement explicite, ateliers… ?" },
  { cle: "organisation", texte: "Comment travaille la classe : combien d'élèves, des groupes, un autre adulte présent ?" },
  { cle: "eleves_signales", texte: "Un élève rencontre-t-il un obstacle dans ce genre de tâche ? Dites ce qu'on voit, sans prénom ni diagnostic." },
];
const QUESTIONS_D_UN_ELEVE: { cle: keyof EleveDuCadre; texte: string }[] = [
  { cle: "vu", texte: "Qu'est-ce qu'on voit exactement, quand cet élève fait ce genre de tâche ?" },
  { cle: "ailleurs", texte: "Est-ce que cela arrive aussi à d'autres moments de la journée ?" },
  { cle: "appuis", texte: "Qu'est-ce que cet élève réussit bien, ou qu'est-ce qui l'aide déjà ?" },
  { cle: "besoin", texte: "De quoi cet élève a-t-il besoin, et pour quoi faire ?" },
];
const AUTRE_ELEVE = "Y a-t-il un autre élève à prévoir ?";

const eleveSignale = (v?: string) => !!v && !/^(?:non|aucun|personne|pas)\b/i.test(v) && v !== A_CHOISIR;

/** La prochaine chose à demander, d'après ce qui manque : c'est le code qui tient la liste. `null` : tout est là. */
export function prochaineQuestion(connu: ConnuDuCadre, sorte: SorteDePreparation, posees: Record<string, number>): { cle: string; base: string; groupe?: string; texte: string } | null {
  const encore = (cle: string) => (posees[cle] ?? 0) < FOIS_PAR_QUESTION;
  for (const q of QUESTIONS_DE_LA_CLASSE) {
    if (q.seulement && q.seulement !== sorte) continue;
    if (!connu[q.cle] && encore(q.cle)) return { cle: q.cle, base: q.cle, groupe: q.groupe, texte: q.texte };
  }
  if (!eleveSignale(connu.eleves_signales)) return null;
  const eleves = connu.eleves ?? [];
  const combien = Math.min(ELEVES_MAX, Math.max(1, eleves.length));
  for (let i = 0; i < combien; i++) {
    for (const q of QUESTIONS_D_UN_ELEVE) {
      const cle = `${q.cle}#${i}`;
      if (!eleves[i]?.[q.cle] && encore(cle)) return { cle, base: q.cle, texte: q.texte };
    }
  }
  if (eleves.length >= ELEVES_MAX) return null;
  if (!connu.autre_eleve && encore(`autre_eleve#${eleves.length}`)) return { cle: `autre_eleve#${eleves.length}`, base: "autre_eleve", texte: AUTRE_ELEVE };
  // Un élève de plus : on recommence par ce qu'on voit.
  if (eleveSignale(connu.autre_eleve) && encore(`vu#${eleves.length}`)) return { cle: `vu#${eleves.length}`, base: "vu", texte: QUESTIONS_D_UN_ELEVE[0].texte };
  return null;
}

/**
 * Un tour de l'entretien : ce qui est établi, et la question d'après. Celle du modèle si elle porte sur ce qui manque ;
 * sinon, la nôtre. Il ne peut donc ni sauter une étape, ni s'arrêter trop tôt, ni répéter sans fin.
 */
export function suiteDeLEntretien(o: {
  sorte: SorteDePreparation; avant: ConnuDuCadre; posees: Record<string, number>; lu: EntretienLu; conversation: ChatMessage[];
}): { connu: ConnuDuCadre; posees: Record<string, number>; question: string | null } {
  const connu = relireLeConnu(fusionnerLeConnu(o.avant, o.lu.connu), o.conversation);
  const q = prochaineQuestion(connu, o.sorte, o.posees);
  if (!q) return { connu, posees: o.posees, question: null };
  const cible = QUESTIONS_DE_LA_CLASSE.find((x) => x.cle === o.lu.cible);
  const surLaMemeChose = o.lu.cible === q.base || (!!q.groupe && cible?.groupe === q.groupe);
  const lue = o.lu.question.trim();
  // Une hypothèse ne nomme jamais de diagnostic : M2PA y tient, et nous aussi.
  const juste = lue && surLaMemeChose && !(q.base === "besoin" && DIAGNOSTIC.test(normaliser(lue)));
  return { connu, posees: { ...o.posees, [q.cle]: (o.posees[q.cle] ?? 0) + 1 }, question: juste ? lue : q.texte };
}

const dit = (t?: string) => (t && t !== A_CHOISIR ? t : "");

/** La ligne « Noté : … » sous la question : ce qu'il a compris, d'un coup d'œil. */
export function resumeDuConnu(c: ConnuDuCadre): string {
  const nb = dit(c.nb_seances).match(/\d+/)?.[0];
  return [dit(c.niveau), dit(c.matiere), dit(c.sujet), nb && `${nb} séance${Number(nb) > 1 ? "s" : ""}`, dit(c.duree)].filter(Boolean).join(" · ");
}

/** Ce qui est établi, en lignes : pour le récapitulatif, et pour la rédaction. */
export function lignesDuConnu(c: ConnuDuCadre, sorte: SorteDePreparation): string[] {
  const choix = (t?: string) => (t === A_CHOISIR ? "à mon choix" : t ?? "");
  const ligne = (nom: string, t?: string) => (t ? `${nom} : ${choix(t)}.`.replace(/\.\.$/, ".") : "");
  const eleves = eleveSignale(c.eleves_signales) ? (c.eleves ?? []) : [];
  return [
    ligne("Niveau", c.niveau), ligne("Matière", c.matiere), ligne("Sujet", c.sujet), ligne("Objectif", c.objectif), ligne("Ce qui montrera la réussite", c.criteres),
    sorte === "sequence" ? ligne("Nombre de séances", c.nb_seances) : ligne("Place dans la séquence", c.place),
    ligne("Durée", c.duree), ligne("Ce qu'ils savent déjà", c.prerequis), ligne("Support", c.support), ligne("Démarche", c.demarche), ligne("La classe", c.organisation),
    ...eleves.map((e, i) => {
      const morceaux = [e.vu && `on voit : ${e.vu}`, e.ailleurs && `ailleurs : ${e.ailleurs}`, e.appuis && `ce qui l'aide : ${e.appuis}`, e.besoin && `retenu : ${e.besoin}`].filter(Boolean);
      return morceaux.length ? `${eleves.length > 1 ? `Élève ${i + 1}` : "Un élève"} : ${morceaux.join(" ; ")}.`.replace(/\.\.$/, ".") : "";
    }),
  ].filter(Boolean);
}

/** « Si j'ai bien compris… » : la dernière chance de corriger, avant une minute de rédaction. */
export const recapitulatif = (c: ConnuDuCadre, sorte: SorteDePreparation): string =>
  `**Si j'ai bien compris :**\n\n${lignesDuConnu(c, sorte).map((l) => `- ${l}`).join("\n")}\n\nJe rédige ?`;
export const RECAP_A_VOIX_HAUTE = "J'ai ce qu'il me faut, le récapitulatif est à l'écran. Je rédige ?";

/** Ce que le modèle a dû choisir seul parce qu'on lui a demandé de rédiger avant la fin : la fiche le dit. */
export function nonPrecise(c: ConnuDuCadre, sorte: SorteDePreparation): string | null {
  const manque = [
    !dit(c.niveau) && "le niveau", !dit(c.matiere) && "la matière", !dit(c.sujet) && "le sujet", !dit(c.objectif) && "l'objectif",
    sorte === "sequence" && !dit(c.nb_seances) && "le nombre de séances", !dit(c.duree) && "la durée", !dit(c.prerequis) && "les prérequis",
  ].filter(Boolean);
  return manque.length ? `Choisi par l'Assistant, à vérifier : ${manque.join(", ")}.` : null;
}

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
const FORMULE_CREUSE_N1 = /\b(feliciter|encourager|valoriser|montrer que tout le monde|bienveillan\w*)\b/;
const DIFFICULTE = /\b(difficult\w*|obstacle\w*|risque\w*|peine\w*|echoue\w*|n'arrive\w* pas)\b/;
const DOMAINES = ["psychomoteur", "affectif", "social", "cognitif"];
/** Ces mots-là se trouvent dans un objectif comme dans un obstacle : ils ne disent pas qu'on parle de la matière. */
const MOTS_DE_TOUTE_TACHE = new Set(["objets", "eleve", "eleves", "seance", "sequence", "sauront", "capable", "collection", "collections", "difficulte", "difficultes", "manipuler", "tache", "taches", "activite"]);

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
export function lireFiche(v: Record<string, unknown>, sorte: SorteDePreparation, permis: string[], connu: ConnuDuCadre = {}): FicheLue {
  const problemes: string[] = [];
  const notes: string[] = [];
  const dureeDite = Number(dit(connu.duree).match(/\d+/)?.[0]) * (/\bh(?:eure)?s?\b/i.test(dit(connu.duree)) ? 60 : 1);

  const seances: SeanceDeLaFiche[] = listeDe(v.seances).map((s, i) => ({
    titre: texteDe(s.titre) || `Séance ${i + 1}`,
    // La durée dite vaut pour toutes les séances : pas besoin de redemander.
    duree: dureeDite >= 5 ? Math.min(240, dureeDite) : Math.max(5, Math.min(240, Math.round(Number(s.duree)) || 45)),
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
  const nbDit = Number(dit(connu.nb_seances).match(/\d+/)?.[0]);
  if (sorte === "sequence" && nbDit > 0 && seances.length && seances.length !== nbDit) problemes.push(`L'enseignant a demandé ${nbDit} séances : il y en a ${seances.length}.`);

  // Les huit besoins, dans leur ordre et sous leur nom, même si le modèle les a renommés.
  const donnes = listeDe(v.niveau1);
  const niveau1 = BESOINS_DU_NIVEAU_1.map((besoin, i) => {
    const indice = new RegExp(INDICES_DES_BESOINS[i]);
    const e = donnes.find((d) => indice.test(normaliser(texteDe(d.besoin)))) ?? (donnes.length === BESOINS_DU_NIVEAU_1.length ? donnes[i] : undefined);
    return { besoin, reponse: auPlus(texteDe(e?.reponse), 2) };
  });
  const sansReponse = niveau1.filter((b) => !b.reponse).map((b) => b.besoin);
  if (sansReponse.length) problemes.push(`Au niveau 1, il manque une réponse pour : ${sansReponse.join(", ")}.`);
  const creux = niveau1.filter((b) => FORMULE_CREUSE_N1.test(normaliser(b.reponse))).map((b) => b.besoin);
  if (creux.length) problemes.push(`Au niveau 1, « féliciter » ou « encourager » ne dit pas ce qui est prévu (${creux.join(", ")}) : nomme un rituel, un affichage, un geste de cette séance.`);

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
    domaine: texteDe(a.domaine), obstacle: auPlus(texteDe(a.obstacle), 1), manifestation: auPlus(texteDe(a.manifestation), 1),
    besoin: auPlus(texteDe(a.besoin), 1), objectifVise: auPlus(texteDe(a.objectif_vise), 1), degre: texteDe(a.degre),
    adaptation: auPlus(texteDe(a.adaptation), 2), aide: auPlus(texteDe(a.aide), 1), vigilance: auPlus(texteDe(a.vigilance), 1),
  })).filter((a) => a.obstacle || a.adaptation).slice(0, ELEVES_MAX);
  const nommes = [...new Set(niveau3.flatMap((a) => normaliser(`${a.obstacle} ${a.manifestation} ${a.besoin} ${a.adaptation}`).match(new RegExp(DIAGNOSTIC.source, "g")) ?? []))];
  if (nommes.length) problemes.push(`Le niveau 3 nomme un diagnostic (${nommes.join(", ")}) : pars de l'obstacle, tel qu'on le voit dans la tâche.`);
  const elevesSignales = eleveSignale(connu.eleves_signales) ? (connu.eleves ?? []).filter((e) => e.vu || e.besoin).length : 0;
  if (niveau3.length < elevesSignales) problemes.push(`L'enseignant a signalé ${elevesSignales} élève${elevesSignales > 1 ? "s" : ""} : le niveau 3 en compte ${niveau3.length}.`);
  // L'obstacle est transversal : il ne parle pas de ce qu'on apprend, c'est toute la différence avec une difficulté en maths.
  const motsDeLaMatiere = new Set([v.notion, v.objectif_apprentissage, connu.sujet].flatMap((t) => motsDe(texteDe(t))).filter((m) => m.length >= 6 && !MOTS_DE_TOUTE_TACHE.has(m)));
  const melanges = [...new Set(niveau3.flatMap((a) => motsDe(a.obstacle).filter((m) => motsDeLaMatiere.has(m))))];
  if (melanges.length) problemes.push(`L'obstacle du niveau 3 parle de la matière (${melanges.join(", ")}) : dis ce qui empêche d'accéder à la tâche, et garde le disciplinaire pour ce qu'on en voit et pour l'objectif visé.`);
  niveau3.forEach((a, i) => {
    if (a.besoin && !/^besoin d.*\bpour\b/i.test(normaliser(a.besoin))) problemes.push(`Au niveau 3, le besoin ${i + 1} s'écrit « Besoin de … pour … ».`);
    if (a.domaine && !DOMAINES.includes(normaliser(a.domaine))) a.domaine = "";
  });

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
  /** Ce que l'entretien a établi : le nombre de séances, la durée, les élèves se vérifient. */
  connu?: ConnuDuCadre;
  surCorrection?: () => void;
}): Promise<{ fiche: FicheDeSeance; notes: string[] } | { reponse: string }> {
  const lire = (rep: string): FicheLue | { reponse: string } | null => {
    const v = lireJson(rep);
    if (!v) return null;
    const avecNoms = rendreAvecLesNoms(v, o.rendre) as Record<string, unknown>;
    if (typeof avecNoms.reponse === "string" && !Array.isArray(avecNoms.seances)) return { reponse: avecNoms.reponse };
    const lue = lireFiche(avecNoms, o.sorte, o.permis, o.connu);
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
        `**${a.obstacle || "Obstacle"}**${a.domaine ? ` (${a.domaine.toLowerCase()})` : ""}`,
        ...(a.manifestation ? [`- Ce qu'on voit : ${a.manifestation}`] : []),
        ...(a.besoin ? [`- ${/^besoin\b/i.test(a.besoin) ? a.besoin : `Besoin : ${a.besoin}`}`] : []),
        ...[["Objectif visé", a.objectifVise], [a.degre ? `Adaptation (${a.degre.toLowerCase()})` : "Adaptation", a.adaptation], ["Ce qu'elle aide à faire", a.aide], ["Vigilance", a.vigilance]]
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
