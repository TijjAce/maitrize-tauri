// ── Un corpus proposé par l'IA, à partir du projet ────────────────────────
//
// Le projet est écrit — un titre, une phrase, des étapes — mais pas son
// vocabulaire. Le modèle le propose : des mots concrets qu'on rencontrera en
// le menant, des phrases simples qui le racontent. Ils s'ajoutent sous ceux
// de l'enseignant, qui relit et retire. Seul le projet part, jamais la
// classe : les prénoms d'élèves qui traîneraient dans une étape sont masqués
// avant l'envoi.

import type { ChatMessage } from "./api";
import { lignesDuCorpus, type Corpus } from "./corpusProjet";
import { phrasesDeLaReponse } from "./phrasesIa";

export interface DemandeCorpus {
  cycle: 2 | 3;
  /** Combien de mots, et combien de phrases — zéro pour ne demander que des mots. */
  mots: number;
  phrases: number;
}
export const DEMANDE_CORPUS: DemandeCorpus = { cycle: 2, mots: 16, phrases: 6 };

/** Ce qu'on dit du projet au modèle : rien d'autre ne part. */
export interface ProjetDecrit { titre: string; descriptif: string; domaines: string; etapes: string[] }

/** Ce qu'on demande au modèle : les mots du projet, puis ses phrases, en deux parties nettes. */
export function promptCorpus(p: ProjetDecrit, d: DemandeCorpus): ChatMessage[] {
  const mots = Math.max(4, Math.min(40, Math.round(d.mots) || 16));
  const phrases = Math.max(0, Math.min(20, Math.round(d.phrases) || 0));
  const systeme = [
    "Tu prépares le vocabulaire d'un projet de classe pour des élèves d'IME (institut médico-éducatif), en français.",
    "Ces mots et ces phrases serviront à fabriquer des jeux : mots mêlés, étiquettes à trier, phrases à remettre en ordre, loto d'images.",
    d.cycle === 2
      ? "Niveau cycle 2 : des mots courants et concrets — des noms d'objets, d'animaux, d'aliments, de lieux, des actions — que l'élève sait déchiffrer ou peut apprendre à lire ; des phrases très simples, au présent."
      : "Niveau cycle 3 : des mots courants, dont quelques mots précis du projet ; des phrases simples, au présent ou au passé composé, qui peuvent avoir un complément.",
    `Réponds en deux parties. D'abord une ligne « MOTS », puis ${mots} mots, un par ligne, sans article, sans majuscule sauf pour un nom propre, sans doublon — le mot seul, pas de définition.`,
    phrases
      ? `Ensuite une ligne « PHRASES », puis ${phrases} phrases de 3 à 8 mots, une par ligne, qui commencent par une majuscule et finissent par un point, sans virgule ; chacune parle d'autre chose.`
      : "Pas de phrases : seulement les mots.",
    "Pas de prénom ni de nom de personne réelle. Les marqueurs entre crochets comme [P1] ne sont pas des mots : ne les recopie pas.",
    "Réponds uniquement par ces parties, sans numéro, sans tiret, sans guillemets, sans commentaire.",
  ].join(" ");
  const lignes = [`Projet : ${p.titre.trim() || "sans titre"}`];
  if (p.descriptif.trim()) lignes.push(`De quoi il s'agit : ${p.descriptif.trim()}`);
  if (p.domaines.trim()) lignes.push(`Domaines : ${p.domaines.trim()}`);
  const etapes = p.etapes.map((e) => e.trim()).filter(Boolean);
  if (etapes.length) lignes.push(`Étapes : ${etapes.join(" ; ")}`);
  return [{ role: "system", content: systeme }, { role: "user", content: lignes.join("\n") }];
}

/** Une ligne sans ce que les modèles ajoutent : numéro, tiret, gras, guillemets. */
const nettoyer = (l: string) => l.trim()
  .replace(/\*\*/g, "")
  .replace(/^(#+|\d+[.)]|[-•*–—])\s*/, "")
  .replace(/^[«"“]\s*|\s*[»"”]$/g, "")
  .trim();

/** Un mot proposé : sans marqueur ni ponctuation finale, trois mots au plus (« pomme de terre »). */
function motPropre(l: string): string {
  const m = l.replace(/\[P\d+\]/g, "").replace(/[.,;:!?…]+$/, "").replace(/\s+/g, " ").trim();
  return m && m.split(" ").length <= 3 ? m : "";
}

/**
 * Le corpus de la réponse : les mots de la partie « MOTS », les phrases de la
 * partie « PHRASES ». Sans en-tête, la forme décide — une phrase a plusieurs
 * mots et finit par un point. Une ligne de mots séparés par des virgules se
 * déplie ; le reste se nettoie comme les phrases proposées.
 */
export function corpusDeLaReponse(rep: string): Corpus {
  let partie: "mots" | "phrases" | null = null;
  const brutMots: string[] = [];
  const brutPhrases: string[] = [];
  for (const brute of (rep ?? "").replace(/```[a-z]*/g, "").split("\n")) {
    const l = nettoyer(brute);
    if (!l) continue;
    const plate = l.replace(/[*_#:\s]/g, "").toLocaleLowerCase("fr");
    if (plate === "mots" || plate === "lesmots") { partie = "mots"; continue; }
    if (plate === "phrases" || plate === "lesphrases") { partie = "phrases"; continue; }
    // « Voici les phrases : » — un en-tête bavard, qui dit tout de même où l'on est.
    if (/:$/.test(l) || /^voici\b/i.test(l)) {
      if (/phrases?\b/i.test(l)) partie = "phrases";
      else if (/\bmots?\b/i.test(l)) partie = "mots";
      continue;
    }
    const p = partie ?? (/[.!?…]$/.test(l) && l.split(" ").length >= 3 ? "phrases" : "mots");
    if (p === "phrases") brutPhrases.push(l);
    else brutMots.push(...l.split(/[,;]+/).map(motPropre).filter(Boolean));
  }
  return {
    mots: lignesDuCorpus(brutMots.join("\n")),
    // Une phrase où le modèle a recopié un marqueur parlerait d'un élève : elle ne passe pas.
    phrases: phrasesDeLaReponse(brutPhrases.join("\n")).filter((p) => !/\[P\d+\]/.test(p)),
  };
}
