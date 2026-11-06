// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── La mémoire de l'Assistant ─────────────────────────────────────────────
//
// « Fais en sorte que mon IA ait une mémoire pour se rappeler de ce que je lui
// dis, selon les dernières infos de la tech » (l'enseignant, 5 novembre 2026).
//
// Ce qui se fait en 2026 — Mem0, les « Memories » de Le Chat chez Mistral,
// l'outil de mémoire d'Anthropic — tient en quelques règles, reprises ici :
// - la mémoire vit hors du modèle, qu'on n'entraîne pas : un magasin que
//   l'enseignant voit, corrige, vide et coupe (🧠 Mémoire, dans l'Assistant) ;
// - après chaque message, un modèle relève ce qui mérite d'être retenu, le
//   compare à ce qui l'est déjà, et propose d'ajouter, de mettre à jour,
//   d'oublier — ou rien ;
// - chaque souvenir garde d'où il vient : les mots mêmes de l'enseignant, qui
//   doivent se retrouver dans son message, sinon le souvenir est écarté (l'IA
//   n'invente rien) ; un souvenir mis à jour garde ses textes d'avant ;
// - ne part au modèle que ce qui tient dans un budget, le plus utile à la
//   question d'abord.
//
// Le magasin : un réglage par souvenir (« assistantMemoire:<id> »), sur cet
// ordinateur seulement. Un souvenir oublié devient un réglage vide.
//
// Jamais un élève : un souvenir qui désigne quelqu'un (« [P1] »), sa santé ou
// ses coordonnées est écarté, et la mémoire part masquée, comme la conversation
// (voir confidentialite.ts).

import { api, MODELE_TACHES, newId, type ChatMessage } from "./api";
import { normaliser } from "./competencesTravaillees";
import { restaurer } from "./confidentialite";
import { motsCles } from "./documentaliste";
import { masquerSurLesEleves } from "./nomsAMasquer";

export const PREFIXE_MEMOIRE = "assistantMemoire:";
/** « 1 » : l'Assistant ne retient plus rien, et ne se sert plus de ce qu'il a retenu. */
export const CLE_MEMOIRE_COUPEE = "assistantMemoireCoupee";
export const MEMOIRE_MAX = 200;
export const LONGUEUR_MAX_SOUVENIR = 220;
/** Ce que la mémoire peut prendre, au plus, dans ce qui part au modèle (en caractères). */
export const BUDGET_MEMOIRE = 1800;
/** Combien de textes d'avant un souvenir garde. */
const HISTORIQUE_MAX = 5;

export interface Souvenir {
  id: string;
  texte: string;
  /** Les mots de l'enseignant d'où il vient. */
  citation: string;
  creeLe: string;
  modifieLe: string;
  /** Ses textes d'avant, quand il a été mis à jour. */
  historique?: { texte: string; jusquau: string }[];
}

// ── Le magasin ─────────────────────────────────────────────────────────────

export function lireSouvenir(id: string, valeur: string): Souvenir | null {
  try {
    const v = JSON.parse(valeur) as Partial<Souvenir>;
    if (!v || typeof v.texte !== "string" || !v.texte.trim()) return null;
    return {
      id, texte: v.texte, citation: typeof v.citation === "string" ? v.citation : "",
      creeLe: typeof v.creeLe === "string" ? v.creeLe : "", modifieLe: typeof v.modifieLe === "string" ? v.modifieLe : (v.creeLe ?? ""),
      ...(Array.isArray(v.historique) && v.historique.length ? { historique: v.historique.filter((h) => h && typeof h.texte === "string") } : {}),
    };
  } catch {
    return null;
  }
}

export const ecrireSouvenir = ({ id: _id, ...s }: Souvenir): string => JSON.stringify(s);

/** Les souvenirs gardés dans les réglages, du plus récemment touché au plus ancien. */
export function lireMemoire(reglages: Record<string, string>): Souvenir[] {
  return Object.entries(reglages)
    .filter(([cle, v]) => cle.startsWith(PREFIXE_MEMOIRE) && v)
    .map(([cle, v]) => lireSouvenir(cle.slice(PREFIXE_MEMOIRE.length), v))
    .filter((s): s is Souvenir => !!s)
    .sort((a, b) => b.modifieLe.localeCompare(a.modifieLe) || a.id.localeCompare(b.id));
}

export async function chargerMemoire(): Promise<Souvenir[]> {
  return lireMemoire(await api.settingsPrefixe(PREFIXE_MEMOIRE).catch(() => ({})));
}

export async function memoireCoupee(): Promise<boolean> {
  return (await api.settingGet(CLE_MEMOIRE_COUPEE).catch(() => null)) === "1";
}

export const garderSouvenir = (s: Souvenir) => api.settingSet(PREFIXE_MEMOIRE + s.id, ecrireSouvenir(s));
export const effacerSouvenir = (id: string) => api.settingSet(PREFIXE_MEMOIRE + id, "");

// ── Ce qui part au modèle ──────────────────────────────────────────────────

/**
 * Les souvenirs qui partent avec la question : tous s'ils tiennent dans le budget ; sinon ceux qui parlent de la
 * question d'abord, puis les plus récents, jusqu'au budget.
 */
export function souvenirsPourLaQuestion(souvenirs: Souvenir[], question: string, budget = BUDGET_MEMOIRE): Souvenir[] {
  const poids = (s: Souvenir) => s.texte.length + 3;
  if (souvenirs.reduce((n, s) => n + poids(s), 0) <= budget) return souvenirs;
  const mots = motsCles(question);
  const pertinence = (s: Souvenir) => { const t = normaliser(s.texte); return mots.filter((m) => t.includes(m)).length; };
  const classes = souvenirs.map((s, rang) => ({ s, rang, p: pertinence(s) })).sort((a, b) => b.p - a.p || a.rang - b.rang);
  const pris: Souvenir[] = [];
  let n = 0;
  for (const { s } of classes) {
    if (n + poids(s) > budget) continue;
    pris.push(s);
    n += poids(s);
  }
  return pris;
}

export const blocDeMemoire = (souvenirs: Pick<Souvenir, "texte">[]): string => souvenirs.map((s) => `- ${s.texte}`).join("\n");

// ── Ce qui se retient ──────────────────────────────────────────────────────

/**
 * Un message où l'enseignant parle de lui, de sa classe, de ce qu'il veut — ou demande de retenir, d'oublier : le
 * seul qui vaille une extraction. Une question nue (« Propose trois ateliers… ») n'en déclenche pas.
 */
export function meriteDEtreRelu(message: string): boolean {
  const t = ` ${normaliser(message).replace(/[^\p{L}\p{N}' ]/gu, " ")} `;
  if (t.trim().length < 12) return false;
  return /\s(je|j'|moi|mon|ma|mes|nous|notre|nos)\s|j'/.test(t)
    || /souvien|retien|rappelle toi|n'oublie|oublie|memorise|garde en tete|toujours|jamais|prefere|habitude/.test(t);
}

const CONSIGNE_MEMOIRE = [
  "Tu tiens la mémoire de l'assistant pédagogique d'un enseignant du premier degré.",
  "Lis son dernier message et dis ce qui mérite d'être retenu pour l'aider dans ses prochaines conversations :",
  "ce qu'il dit de lui et de son métier ; de sa classe dans son ensemble (niveaux, effectif, structure, organisation) ;",
  "de ses façons de faire, de ses outils et méthodes ; de ses projets en cours ; de ce qu'il attend de tes réponses (ton, longueur, forme).",
  "S'il demande de retenir quelque chose, retiens-le. S'il demande d'oublier, ou dit qu'un souvenir est faux ou dépassé, supprime-le.",
  "Ne retiens jamais : un élève ou une personne en particulier (les marqueurs comme [P1]), la santé, la famille, une adresse, un numéro,",
  "une question ponctuelle, ce qu'il fait seulement aujourd'hui, ni ce que l'assistant a répondu.",
  "Compare avec les souvenirs déjà retenus, numérotés : sur le même sujet, mets à jour plutôt que d'ajouter ;",
  "si rien n'est durable, ne propose rien.",
  "Un souvenir est une phrase courte, au présent, sans « je », qui commence par un verbe ou un nom :",
  "« Enseigne en IME, à des élèves de 6 à 12 ans. » ; « Préfère des séances de trente minutes au plus. »",
  "Pour chaque opération, recopie dans « citation » les mots exacts du message qui la justifient.",
  'Réponds en JSON : {"operations":[{"op":"ajouter","texte":"…","citation":"…"},'
    + '{"op":"modifier","numero":2,"texte":"…","citation":"…"},{"op":"supprimer","numero":3,"citation":"…"}]}, ou {"operations":[]}.',
].join(" ");

/** La demande au modèle : les souvenirs déjà retenus, numérotés, et le dernier message — tous deux déjà masqués. */
export function demandeDeMemoire(message: string, souvenirs: string[]): ChatMessage[] {
  const liste = souvenirs.length ? souvenirs.map((t, i) => `${i + 1}. ${t}`).join("\n") : "(aucun)";
  return [
    { role: "system", content: CONSIGNE_MEMOIRE },
    { role: "user", content: `Souvenirs déjà retenus :\n${liste}\n\nDernier message de l'enseignant :\n« ${message} »` },
  ];
}

export type Operation =
  | { op: "ajouter"; texte: string; citation: string }
  | { op: "modifier"; numero: number; texte: string; citation: string }
  | { op: "supprimer"; numero: number; citation: string };

/** Un souvenir qui désigne quelqu'un ou dit sa santé, ses coordonnées, une date : jamais gardé. */
const DESIGNE_QUELQUUN = /\[(P|Santé|Sante|Contact|Numéro|Numero|Date)\s*\d/i;

const plier = (s: string) => normaliser(s).replace(/[«»"“”]/g, "").replace(/\s+/g, " ").trim();

/**
 * Ce que le modèle propose, gardé seulement si c'est sûr : sa citation se retrouve mot pour mot dans le message
 * (à la casse, aux accents et aux espaces près), son texte est court et ne désigne personne, son numéro existe ; un
 * ajout qui redit un souvenir est écarté ; une opération par souvenir. Cinq opérations au plus.
 */
export function lireOperations(reponse: string, message: string, souvenirs: string[]): Operation[] {
  let v: unknown;
  try { v = JSON.parse(reponse.slice(reponse.indexOf("{"), reponse.lastIndexOf("}") + 1)); } catch { return []; }
  const brutes = (v as { operations?: unknown })?.operations;
  if (!Array.isArray(brutes)) return [];
  const dit = plier(message);
  const deja = new Set(souvenirs.map(plier));
  const touches = new Set<number>();
  const gardees: Operation[] = [];
  for (const o of brutes.slice(0, 5) as Record<string, unknown>[]) {
    if (!o || typeof o !== "object") continue;
    const citation = typeof o.citation === "string" ? o.citation.trim() : "";
    if (plier(citation).length < 3 || !dit.includes(plier(citation))) continue;
    const texte = typeof o.texte === "string" ? o.texte.trim().replace(/\s+/g, " ") : "";
    const numero = Number(o.numero);
    const numeroValide = Number.isInteger(numero) && numero >= 1 && numero <= souvenirs.length && !touches.has(numero);
    const texteValide = !!texte && texte.length <= LONGUEUR_MAX_SOUVENIR && !DESIGNE_QUELQUUN.test(texte);
    if (o.op === "ajouter" && texteValide && !deja.has(plier(texte))) {
      gardees.push({ op: "ajouter", texte, citation });
      deja.add(plier(texte));
    } else if (o.op === "modifier" && texteValide && numeroValide) {
      gardees.push({ op: "modifier", numero, texte, citation });
      touches.add(numero);
    } else if (o.op === "supprimer" && numeroValide) {
      gardees.push({ op: "supprimer", numero, citation });
      touches.add(numero);
    }
  }
  return gardees;
}

/** Ce qu'une opération a changé : de quoi l'enregistrer, le dire, et le défaire. */
export type Changement =
  | { sorte: "ajoute"; apres: Souvenir }
  | { sorte: "modifie"; avant: Souvenir; apres: Souvenir }
  | { sorte: "oublie"; avant: Souvenir };

/** Les opérations, appliquées aux souvenirs dans l'ordre où le modèle les a vus (son numéro 1 est `souvenirs[0]`). */
export function appliquerOperations(souvenirs: Souvenir[], ops: Operation[], maintenant: string, nouvelId: () => string = newId): Changement[] {
  const changements: Changement[] = [];
  let nombre = souvenirs.length;
  for (const o of ops) {
    if (o.op === "ajouter") {
      if (nombre >= MEMOIRE_MAX) continue;
      changements.push({ sorte: "ajoute", apres: { id: nouvelId(), texte: o.texte, citation: o.citation, creeLe: maintenant, modifieLe: maintenant } });
      nombre++;
    } else {
      const avant = souvenirs[o.numero - 1];
      if (!avant) continue;
      if (o.op === "supprimer") {
        changements.push({ sorte: "oublie", avant });
        nombre--;
      } else if (plier(o.texte) !== plier(avant.texte)) {
        const historique = [...(avant.historique ?? []), { texte: avant.texte, jusquau: maintenant }].slice(-HISTORIQUE_MAX);
        changements.push({ sorte: "modifie", avant, apres: { ...avant, texte: o.texte, citation: o.citation, modifieLe: maintenant, historique } });
      }
    }
  }
  return changements;
}

export async function enregistrerChangements(changements: Changement[]): Promise<void> {
  for (const c of changements) await (c.sorte === "oublie" ? effacerSouvenir(c.avant.id) : garderSouvenir(c.apres));
}

/** Défaire des changements : chaque souvenir retrouve son état d'avant. */
export async function defaireChangements(changements: Changement[]): Promise<void> {
  for (const c of [...changements].reverse()) await (c.sorte === "ajoute" ? effacerSouvenir(c.apres.id) : garderSouvenir(c.avant));
}

/** Ce que dit le bandeau, après coup : « 🧠 Retenu : … ». */
export function direLesChangements(changements: Changement[]): string {
  return changements.map((c) => c.sorte === "ajoute" ? `Retenu : « ${c.apres.texte} »`
    : c.sorte === "modifie" ? `Mis à jour : « ${c.apres.texte} »`
    : `Oublié : « ${c.avant.texte} »`).join(" · ");
}

/**
 * Relit le dernier message de l'enseignant et met la mémoire à jour : sur l'ordinateur, le message et les souvenirs
 * sont masqués ensemble (rien ne désigne un élève), le modèle des tâches propose, Maitrize ne garde que ce qui est sûr
 * et remet les vrais mots. Rien si la mémoire est coupée ou si le message ne parle ni de lui ni de sa classe.
 */
export async function retenirDuMessage(message: string, maintenant = new Date().toISOString()): Promise<Changement[]> {
  if (!meriteDEtreRelu(message) || await memoireCoupee()) return [];
  const souvenirs = await chargerMemoire();
  const masque = await masquerSurLesEleves([message, ...souvenirs.map((s) => s.texte)]);
  const [messageMasque, ...souvenirsMasques] = masque.textes;
  // Ce qui part ici est déjà parti avec la conversation : il ne s'arrête pas pour la relecture (voir relectureEnvoi).
  const reponse = await api.mistralChat(demandeDeMemoire(messageMasque, souvenirsMasques), MODELE_TACHES, true, false);
  const remettre = (t: string) => restaurer(t, masque.table).texte;
  const ops = lireOperations(reponse, messageMasque, souvenirsMasques).map((o): Operation => o.op === "supprimer"
    ? { ...o, citation: remettre(o.citation) }
    : { ...o, texte: remettre(o.texte), citation: remettre(o.citation) });
  const changements = appliquerOperations(souvenirs, ops, maintenant);
  await enregistrerChangements(changements);
  return changements;
}
