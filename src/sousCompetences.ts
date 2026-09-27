// Les compétences d'une séance qu'on écrit soi-même, et celles que
// l'assistant propose.
//
// La compétence d'une séquence est celle du programme ; les séances y
// mènent par des marches plus petites, que le référentiel n'écrit pas :
// « reconnaître son prénom parmi trois », « poser une addition sans
// retenue ». On les écrit à la main dans la séance — ou l'on demande à
// l'assistant d'en proposer, à partir de la compétence visée et de
// l'objectif, et l'on garde celles qui conviennent. Rien de nominatif ne
// part : des intitulés de compétences et un objectif, c'est tout.

import type { ChatMessage } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";

/** Le « référentiel » d'une compétence écrite à la main : il n'y en a pas. */
export const SOURCE_MANUELLE = "Sous-compétence";

const nouvelId = () => (globalThis.crypto?.randomUUID?.() ?? `s${Date.now()}${Math.random().toString(36).slice(2)}`);

/** Vrai pour une compétence qui ne vient pas d'un référentiel. */
export const estManuelle = (c: CompetenceSelectionnee) => !c.competenceRefId;

/** Une compétence écrite à la main, rattachée au domaine et à la compétence de la séquence. */
export function competenceManuelle(texte: string, contexte: { domaineTitre?: string; competenceVisee?: string } = {}): CompetenceSelectionnee {
  return {
    id: nouvelId(), referentielNom: SOURCE_MANUELLE, domaineId: "", domaineTitre: contexte.domaineTitre ?? "",
    sousDomaineTitre: contexte.competenceVisee ?? "", competenceGeneraleTitre: null,
    competenceTitre: texte.trim().replace(/\s+/g, " "), niveau: null, competenceRefId: null,
  };
}

/** Même intitulé, à la casse et aux accents près. */
const cle = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim().replace(/\.$/, "");

/** Ajoute une compétence manuelle si son texte n'y est pas déjà. */
export function ajouterManuelle(comps: CompetenceSelectionnee[], texte: string, contexte: { domaineTitre?: string; competenceVisee?: string } = {}): CompetenceSelectionnee[] {
  const propre = texte.trim();
  if (!propre || comps.some((c) => cle(c.competenceTitre) === cle(propre))) return comps;
  return [...comps, competenceManuelle(propre, contexte)];
}

export interface ContexteProposition {
  competenceVisee: string;
  domaineTitre: string;
  cycle: string;
  titreSeance: string;
  objectifs: string;
  /** Ce que la séance vise déjà : on ne le redit pas. */
  dejaLa: string[];
}

export function consigneSousCompetences(x: ContexteProposition): ChatMessage[] {
  const deja = x.dejaLa.filter(Boolean);
  return [
    { role: "system", content: "Tu es un enseignant spécialisé en France. Tu écris des sous-compétences : des étapes petites et observables qui mènent à une compétence du programme. Tu réponds en français, uniquement par un tableau JSON de chaînes." },
    { role: "user", content: `Compétence visée par la séquence${x.domaineTitre ? ` (${x.domaineTitre})` : ""}${x.cycle ? `, ${x.cycle}` : ""} :
${x.competenceVisee || "(non précisée)"}

Séance : ${x.titreSeance || "(sans titre)"}
Objectif de la séance :
${x.objectifs || "(non précisé)"}
${deja.length ? `\nDéjà visé par cette séance, à ne pas redire :\n${deja.map((d) => `- ${d}`).join("\n")}\n` : ""}
Propose de 4 à 6 sous-compétences que cette séance fait travailler, en marche vers la compétence visée.
- Chacune commence par un verbe d'action à l'infinitif et tient en une ligne (« Reconnaître son prénom parmi trois étiquettes »).
- Observable : on doit pouvoir dire si l'élève y arrive ou pas.
- Du plus simple au plus exigeant.
- Fidèle à l'objectif écrit ; n'invente pas d'autre notion.

Réponds uniquement par un tableau JSON de chaînes, sans texte autour :
["…","…","…","…"]` },
  ];
}

/** Relit la réponse : le tableau JSON, ses chaînes propres, sans doublon, huit au plus. */
export function lireSousCompetences(reponse: string): string[] {
  const debut = reponse.indexOf("[");
  const fin = reponse.lastIndexOf("]");
  if (debut < 0 || fin <= debut) return [];
  let brut: unknown;
  try { brut = JSON.parse(reponse.slice(debut, fin + 1)); } catch { return []; }
  if (!Array.isArray(brut)) return [];
  const vues = new Set<string>();
  const sortie: string[] = [];
  for (const x of brut) {
    const texte = (typeof x === "string" ? x : typeof x === "object" && x && typeof (x as { texte?: unknown }).texte === "string" ? (x as { texte: string }).texte : "")
      .replace(/^\s*[-•*\d.)\s]+/, "").trim().replace(/\s+/g, " ");
    if (!texte || vues.has(cle(texte))) continue;
    vues.add(cle(texte));
    sortie.push(texte);
    if (sortie.length >= 8) break;
  }
  return sortie;
}
