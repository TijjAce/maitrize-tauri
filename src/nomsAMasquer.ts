// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// Les noms à masquer avant tout envoi à l'IA (voir `confidentialite`).
//
// Les élèves d'abord ; mais un compte rendu ou un bilan nomme aussi des
// adultes : la maman, l'AESH, la collègue du mardi, l'enseignant lui-même. On
// masque donc en plus les personnes que l'enseignant a notées dans les repères
// de l'établissement, son nom, et celles que le texte en cours présente — les
// participants d'une réunion. L'établissement — son nom, son adresse — part
// masqué lui aussi.

import { api } from "./api";
import { nomsDansUnTexte, pseudonymiserTout, sansMarqueursRestants, type Remplacement } from "./confidentialite";
import { CONTACTS, lireEtablissement } from "./etablissement";

/** Les élèves, l'enseignant, les contacts de l'établissement, et les personnes nommées dans `textes`. */
export async function nomsAMasquer(textes: string[] = []): Promise<string[]> {
  // Les réglages illisibles n'empêchent pas de masquer le reste. La liste des élèves, si : sans elle, rien ne part.
  const lire = async <T,>(f: () => Promise<T>, defaut: T): Promise<T> => { try { return await f(); } catch { return defaut; } };
  const [eleves, reglages] = await Promise.all([
    (async () => api.elevesList())().catch(() => { throw new Error("La liste des élèves ne se lit pas : rien n'est envoyé, pour ne laisser partir aucun prénom."); }),
    lire((): Promise<Record<string, string>> => api.settingsAll(), {}),
  ]);
  const contacts = lireEtablissement(reglages).contacts;
  const libres = [...CONTACTS.map((c) => contacts[c.id] ?? ""), ...textes].filter(Boolean);
  const enseignant = (reglages.enseignantNom ?? "").trim();
  return [...new Set([...eleves.map((e) => e.nom), ...(enseignant ? [enseignant] : []), ...libres.flatMap(nomsDansUnTexte)])];
}

/** L'établissement : son nom et son adresse, tels que les réglages les gardent. */
export async function lieuxAMasquer(): Promise<string[]> {
  let reglages: Record<string, string> = {};
  // Des réglages illisibles n'empêchent pas d'envoyer : on masque ce qu'on sait.
  try { reglages = await api.settingsAll(); } catch { /* sans réglages, sans lieux */ }
  return [reglages.ecole ?? "", lireEtablissement(reglages).adresse].map((l) => l.trim()).filter(Boolean);
}

// Ce que le masque repère de lui-même — « son frère Thaddée », « habite à
// Sarcelles » — revient en clair dans la réponse. Ce texte repart au tour
// suivant, ou dans la passe suivante d'une réunion, sans ce qui désignait le nom :
// « Thaddée viendra » serait parti tel quel. On garde donc ces noms-là, sur cet
// ordinateur seulement (la clé n'est pas des réglages partagés), pour les
// masquer ensuite où qu'ils soient, à leur majuscule.
const CLE_REPERES = "masque:reperes";
const REPERES_MAX = 500;

interface Reperes { noms: string[]; lieux: string[] }

async function lireReperes(): Promise<Reperes> {
  try {
    const v = JSON.parse((await api.settingGet(CLE_REPERES)) ?? "{}");
    return { noms: Array.isArray(v?.noms) ? v.noms : [], lieux: Array.isArray(v?.lieux) ? v.lieux : [] };
  } catch { return { noms: [], lieux: [] }; }
}

/** Retient ce qu'un masque vient de repérer. Sans effet sur l'envoi s'il échoue : le masque de ce tour est déjà fait. */
export async function retenirLesReperes(table: Remplacement[]): Promise<void> {
  const noms = table.filter((r) => r.genre === "personne").map((r) => r.original);
  const lieux = table.filter((r) => r.genre === "lieu").map((r) => r.original);
  if (!noms.length && !lieux.length) return;
  try {
    const avant = await lireReperes();
    const apres = {
      noms: [...new Set([...avant.noms, ...noms])].slice(-REPERES_MAX),
      lieux: [...new Set([...avant.lieux, ...lieux])].slice(-REPERES_MAX),
    };
    if (apres.noms.length !== avant.noms.length || apres.lieux.length !== avant.lieux.length) await api.settingSet(CLE_REPERES, JSON.stringify(apres));
  } catch { /* le prochain envoi essaiera de nouveau */ }
}

/** Tout ce qu'il faut pour masquer un texte sur les élèves : les noms, les lieux, et ce qui a déjà été repéré. */
export async function masqueDesEleves(textes: string[] = []): Promise<{ noms: string[]; lieux: string[]; reperes: Reperes }> {
  const [noms, lieux, reperes] = await Promise.all([nomsAMasquer(textes), lieuxAMasquer(), lireReperes()]);
  return { noms, lieux, reperes };
}

/**
 * Des textes qui parlent des élèves, prêts à partir : les noms connus, et tout
 * ce qui désigne quelqu'un (voir `confidentialite`). `autres` : des noms en
 * plus, ceux que l'appelant connaît déjà.
 */
export async function masquerSurLesEleves(textes: string[], autres: string[] = []): Promise<{ textes: string[]; table: Remplacement[] }> {
  const { noms, lieux, reperes } = await masqueDesEleves();
  const masque = pseudonymiserTout(textes, [...autres, ...noms], { portee: "eleves", lieux, reperes });
  void retenirLesReperes(masque.table);
  return masque;
}

/**
 * Un texte de préparation de classe : les noms connus et l'établissement, rien d'autre. Les personnages d'une
 * histoire et les dates d'une leçon y gardent leur sens. Comme ailleurs, sans la liste des élèves, rien ne part.
 */
export async function masquerLaPreparation(textes: string[], autres: string[] = []): Promise<{ textes: string[]; table: Remplacement[] }> {
  const [noms, lieux] = await Promise.all([nomsAMasquer(), lieuxAMasquer()]);
  return pseudonymiserTout(textes, [...autres, ...noms], { lieux });
}

/**
 * Ce qu'une voix de Mistral peut lire : un son ne se restaure pas. La phrase part
 * donc sans rien qui désigne quelqu'un, et dit « une personne », « un lieu ».
 */
export async function pourLaVoix(texte: string): Promise<string> {
  const { textes } = await masquerSurLesEleves([texte]);
  return sansMarqueursRestants(textes[0] ?? "");
}
