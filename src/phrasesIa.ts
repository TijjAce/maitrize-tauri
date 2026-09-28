// Des phrases proposées par l'IA, pour les phrases en désordre.
//
// L'enseignant dit le thème, le cycle, le nombre et la longueur ; le modèle
// propose des phrases simples, une par ligne, que l'enseignant relit, garde
// ou retouche — elles s'ajoutent sous les siennes, rien ne s'écrase. Rien de
// la classe ne part : ni prénom ni élève, un thème et un niveau suffisent.

import type { ChatMessage } from "./api";

export interface DemandePhrases {
  theme: string;
  cycle: 2 | 3;
  combien: number;
  /** Le nombre de mots au plus par phrase. */
  motsMax: number;
}
export const DEMANDE_PHRASES: DemandePhrases = { theme: "", cycle: 2, combien: 6, motsMax: 6 };

/** Ce qu'on demande au modèle : des phrases faites pour être découpées et remises en ordre. */
export function promptPhrases(d: DemandePhrases): ChatMessage[] {
  const combien = Math.max(1, Math.min(20, Math.round(d.combien) || 6));
  const motsMax = Math.max(3, Math.min(15, Math.round(d.motsMax) || 6));
  const systeme = [
    "Tu écris des phrases d'entraînement à la lecture pour des élèves d'IME (institut médico-éducatif), en français.",
    "Elles servent à un jeu de phrases en désordre : les mots de chaque phrase sont mélangés sur des étiquettes, l'élève les remet dans l'ordre.",
    d.cycle === 2
      ? "Niveau cycle 2 : des phrases très simples, au présent, avec des mots courants et concrets que l'élève sait déchiffrer."
      : "Niveau cycle 3 : des phrases simples, au présent ou au passé composé, avec un vocabulaire courant ; une phrase peut avoir un complément.",
    `Chaque phrase a entre 3 et ${motsMax} mots, commence par une majuscule et finit par un point ou un point d'interrogation.`,
    "Pas de virgule, pas de mot rare, pas de prénom ni de nom de personne réelle (« Maman », « le maître », « la maîtresse » conviennent).",
    "Chaque phrase parle d'autre chose que les autres.",
    "Réponds uniquement par les phrases, une par ligne, sans numéro, sans tiret, sans guillemets, sans commentaire.",
  ].join(" ");
  const theme = d.theme.trim();
  const demande = `${combien} phrases${theme ? ` sur le thème : ${theme}` : ""}, ${motsMax} mots au plus chacune.`;
  return [{ role: "system", content: systeme }, { role: "user", content: demande }];
}

/** Les phrases de la réponse, une par ligne, débarrassées de ce que les modèles ajoutent, sans doublon. */
export function phrasesDeLaReponse(rep: string): string[] {
  const vues = new Set<string>();
  const sortie: string[] = [];
  for (const brute of rep.replace(/```[a-z]*/g, "").split("\n")) {
    let p = brute.trim()
      .replace(/^(\d+[.)]|[-•*–])\s*/, "")
      .replace(/^[«"“]\s*|\s*[»"”]$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!p || /^(voici|phrases?\b)/i.test(p) && p.endsWith(":")) continue;
    if (p.split(" ").length < 2) continue;
    p = p[0].toLocaleUpperCase("fr") + p.slice(1);
    if (!/[.!?…]$/.test(p)) p += ".";
    const cle = p.toLowerCase();
    if (vues.has(cle)) continue;
    vues.add(cle);
    sortie.push(p);
  }
  return sortie;
}
