// Les compétences qu'une séquence vise déjà, pour le dire dans l'arbre.
//
// En créant une séquence, on choisit une compétence dans le référentiel — et
// l'on ne sait pas, à ce moment-là, si une séquence de l'année la vise déjà.
// On en refait une, ou l'on croit avoir tout couvert alors que trois
// compétences n'ont rien. Un repère discret sur les compétences déjà visées,
// avec le titre de la séquence au survol, règle les deux.

import type { Sequence } from "./api";

/** Ce qui identifie une compétence visée, comme l'arbre la reconnaît. */
export interface CompetenceVisee {
  referentielNom: string;
  sousDomaineTitre: string;
  competenceRefId?: string | null;
  competenceTitre: string;
}

/**
 * La clé d'une compétence : son référentiel, son sous-domaine, son entrée.
 *
 * Deux référentiels reprennent parfois les mêmes intitulés ; c'est le trio
 * qui départage. Sans identifiant — une compétence écrite à la main —,
 * l'intitulé fait office.
 */
export const cleDeVisee = (c: CompetenceVisee) =>
  `${c.referentielNom}|${c.sousDomaineTitre}|${c.competenceRefId || c.competenceTitre.trim().toLowerCase()}`;

/**
 * Les titres de séquences par compétence visée.
 *
 * La séquence qu'on est en train de modifier est écartée : elle ne se vise
 * pas elle-même. Une compétence visée illisible — un vieux JSON, une
 * synchronisation à moitié passée — est ignorée plutôt que de tout faire
 * tomber.
 */
export function sequencesParCompetence(sequences: Sequence[], saufId = ""): Map<string, string[]> {
  const parCle = new Map<string, string[]>();
  for (const s of sequences) {
    if (!s.competenceVisee || s.id === saufId) continue;
    let c: unknown;
    try { c = JSON.parse(s.competenceVisee); } catch { continue; }
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    const chaine = (v: unknown) => (typeof v === "string" ? v : "");
    const visee: CompetenceVisee = {
      referentielNom: chaine(o.referentielNom), sousDomaineTitre: chaine(o.sousDomaineTitre),
      competenceRefId: chaine(o.competenceRefId) || null, competenceTitre: chaine(o.competenceTitre),
    };
    if (!visee.competenceTitre && !visee.competenceRefId) continue;
    const cle = cleDeVisee(visee);
    const titre = s.titre.trim() || "Séquence sans titre";
    const liste = parCle.get(cle) ?? [];
    if (!liste.includes(titre)) liste.push(titre);
    parCle.set(cle, liste);
  }
  return parCle;
}

/** Les séquences qui visent déjà cette compétence, s'il y en a. */
export const titresVisant = (parCle: Map<string, string[]>, c: CompetenceVisee): string[] =>
  parCle.get(cleDeVisee(c)) ?? [];

/** Ce que dit l'infobulle : « Déjà visée par : Les nombres jusqu'à 59 ». */
export const infobulleVisee = (titres: string[]) =>
  titres.length ? `Déjà visée par : ${titres.join(" · ")}` : "";
