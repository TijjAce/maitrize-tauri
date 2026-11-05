// ── Ce que l'Assistant reçoit avant la conversation ──────────────────────
//
// « Copie un peu pour rajouter à mon IA » (l'enseignant, 5 novembre 2026),
// après l'analyse de M2PA, l'assistant de planification de l'accessibilité
// publié sur la Forge des communs numériques éducatifs (licence AGPL, comme
// Maitrize). M2PA n'entraîne aucun modèle : il soigne sa consigne et y joint des
// textes de référence, ciblés sur le niveau de la séance. Repris ici, avec nos
// mots :
// - un rôle précis, et la démarche en trois niveaux de la M2PA pour adapter ou
//   différencier (Ryckebusch, Carra et Cadalen, 2026 ; Cnesco, 2017 ;
//   Millon-Fauré et Gombert, 2021) ;
// - avant une longue production, dire ce qu'on a compris et poser au plus deux
//   questions quand il manque l'essentiel ;
// - les attendus du programme officiel qui parlent de la question, pris dans les
//   référentiels de l'application et ciblés sur le cycle de la classe, à citer
//   mot pour mot, sans en inventer (documentaliste.ts) ;
// - ce que l'enseignant a dit dans ses conversations d'avant (memoireAssistant.ts).
//
// Le contexte désactivé, rien de ce qui précède ne part, sauf la mémoire, qui a
// son propre interrupteur ; sans rien de tout cela, aucun message système.

import type { Referentiel } from "./api";
import { normaliser } from "./competencesTravaillees";
import { CYCLE_DU_NIVEAU, chercherDansLesProgrammes, cycleDuReferentiel, extraitsDesProgrammes, type TrouvailleBO } from "./documentaliste";

export const ROLE_DE_L_ASSISTANT =
  "Tu es l'assistant pédagogique de Maîtrize, une application pour les enseignants du premier degré français "
  + "(maternelle, élémentaire, établissements et services médico-sociaux). Tu aides à concevoir des séquences et des séances, "
  + "à formuler des objectifs et des compétences alignés sur les programmes officiels, à différencier, à adapter, et à organiser "
  + "la classe. Réponds en français, de façon concrète et structurée, sans flatterie.";

export const AVANT_DE_PRODUIRE =
  "Avant une production longue — une séquence, une séance, une fiche, une progression —, si la demande laisse de côté ce qui "
  + "la change (le niveau, la durée, l'objectif, des élèves à besoins particuliers), dis en une phrase ce que tu as compris et "
  + "pose au plus deux questions, puis attends la réponse. Sinon, réponds directement.";

export const TROIS_NIVEAUX = [
  "Pour adapter une séance ou différencier, raisonne en trois niveaux, d'après la M2PA (Ryckebusch, Carra et Cadalen, 2026).",
  "N1 : ce dont tous les élèves ont besoin, prévu pour tous — la sécurité d'abord, puis le sens de la tâche, le sentiment de",
  "compétence, l'autonomie sociale, être acteur, le soutien de la mémoire, l'autonomie cognitive, l'automatisation.",
  "N2 : la différenciation au sens du Cnesco (2017) — varier les contenus, les démarches ou les productions, avec le même",
  "objectif et les mêmes critères de réussite pour tous.",
  "N3 : les adaptations pour un élève à besoins éducatifs particuliers, de la plus légère à la plus forte (Millon-Fauré et",
  "Gombert, 2021) — accommodement, ajustement, adaptation parallèle, adaptation coïncidente —, en partant de l'obstacle qu'il",
  "rencontre dans la tâche. Préfère ce qui sert à tous avant une adaptation individuelle, et la plus légère qui suffise.",
].join(" ");

export const AVEC_LES_PROGRAMMES =
  "Attendus du programme officiel qui parlent de la demande, tirés des référentiels installés dans l'application et ciblés sur "
  + "le cycle de la classe. Quand tu t'appuies sur le programme, cite-les mot pour mot, entre guillemets ; n'invente aucun attendu "
  + "officiel ; s'ils ne répondent pas à la demande, n'en parle pas.";

export const AVEC_LA_MEMOIRE =
  "Ce que l'enseignant t'a dit dans ses conversations d'avant (ta mémoire). Tiens-en compte sans le réciter ; s'il dit autre "
  + "chose aujourd'hui, c'est ce qu'il dit aujourd'hui qui compte.";

/**
 * Le message système de l'Assistant : le rôle et ses règles, le contexte de la classe et les programmes quand le
 * contexte est activé (`role`), la mémoire quand elle a quelque chose. Vide s'il n'y a rien : aucun message ne part.
 */
export function consigneDeLAssistant(o: { role?: boolean; contexte?: string; programmes?: string; memoire?: string }): string {
  const parties: string[] = [];
  if (o.role) parties.push(ROLE_DE_L_ASSISTANT, AVANT_DE_PRODUIRE, TROIS_NIVEAUX);
  if (o.role && o.contexte?.trim()) {
    parties.push(`Contexte de la classe (données non personnelles, aucune information nominative sur les élèves) :\n${o.contexte.trim()}`);
  }
  if (o.role && o.programmes?.trim()) parties.push(`${AVEC_LES_PROGRAMMES}\n${o.programmes.trim()}`);
  if (o.memoire?.trim()) parties.push(`${AVEC_LA_MEMOIRE}\n${o.memoire.trim()}`);
  return parties.join("\n\n");
}

/** Ce qu'il faut pour qu'un attendu parte : deux mots de la demande, ou un dans son intitulé et son niveau. */
export const SEUIL_DES_PROGRAMMES = 3;

/**
 * Les mots d'une demande qui ne disent pas son sujet : ce qu'on demande (une séquence, des idées…) et pour qui (le
 * niveau, la structure). Laissés dans la recherche, « CM1 », « CM2 » ou « niveau » faisaient remonter n'importe quel
 * attendu de ces niveaux — les langues vivantes pour une séquence sur les fractions (vu dans la maquette).
 */
const MOTS_SANS_SUJET = new Set([
  "sequence", "sequences", "seance", "seances", "propose", "proposer", "proposes", "proposez", "donne", "donner", "idee", "idees",
  "activite", "activites", "atelier", "ateliers", "fiche", "fiches", "exercice", "exercices", "niveau", "niveaux", "double",
  "travaille", "travaillent", "travaillons", "ime", "ulis", "segpa", "sessad", "classe", "classes", "besoin", "besoins",
  "veux", "voudrais", "peux", "pourrais", "merci", "bonjour", "aide", "aider", "cycle",
]);

/**
 * Les attendus qui parlent de la demande, comme M2PA cible les programmes sur le cycle de la séance : seulement les
 * référentiels du cycle que la demande nomme (« en CP »), sinon de celui de la classe — et ceux qui n'annoncent pas de
 * cycle, souvent ceux de l'enseignant. On n'y cherche que les mots du sujet ; six attendus au plus, assez pertinents.
 */
export function programmesPourLaDemande(refs: Referentiel[], demande: string, niveaux: string[], maximum = 6): TrouvailleBO[] {
  const texte = normaliser(demande);
  const mots = texte.replace(/[^\p{L}\p{N}' ]/gu, " ").split(" ").filter(Boolean);
  const nommes = new Set(mots.map((m) => CYCLE_DU_NIVEAU[m]).filter((c): c is number => !!c));
  const cycleNomme = texte.match(/cycle\s*([123])/);
  if (cycleNomme) nommes.add(Number(cycleNomme[1]));
  const cycles = nommes.size ? nommes : new Set(niveaux.map((n) => CYCLE_DU_NIVEAU[normaliser(n)]).filter((c): c is number => !!c));
  const duCycle = cycles.size ? refs.filter((r) => { const c = cycleDuReferentiel(r); return !c || cycles.has(c); }) : refs;
  const sujet = mots.filter((m) => !CYCLE_DU_NIVEAU[m] && !MOTS_SANS_SUJET.has(m) && !/^[123]$/.test(m)).join(" ");
  return chercherDansLesProgrammes(duCycle, sujet, maximum * 3)
    .filter((t) => t.score >= SEUIL_DES_PROGRAMMES)
    .slice(0, maximum);
}

export const extraitsPourLAssistant = (trouvailles: TrouvailleBO[]): string => extraitsDesProgrammes(trouvailles);
