// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Une réunion comme une conversation ─────────────────────────────────────
//
// « Ne reformule rien, juste tu transcris, et je veux de la reconnaissance de
// voix avec les personnages qui parlent, comme un tchat » (demande de
// l'enseignant, 2026-11-02). Le texte de la réunion est la conversation
// elle-même : un paragraphe par tour de parole, « Nom : ce qui est dit ». Il
// se lit tel quel — copié, imprimé —, et l'écran en fait des bulles.
// Renommer une personne, c'est réécrire son nom en tête de ses tours.

/** Le nom d'une voix reconnue, tant que l'enseignant ne l'a pas renommée : « speaker_2 » → « Personne 2 ». */
export function nomParDefaut(intervenant: string | null): string {
  if (!intervenant) return "";
  const n = /(\d+)$/.exec(intervenant)?.[1];
  return n ? `Personne ${n}` : intervenant;
}

/** Un nom en tête de paragraphe : court, sans deux-points ni retour à la ligne. */
const TETE = /^([^:\n]{1,40}?) : ([\s\S]*)$/;
const PERSONNE = /^Personne \d+$/;

/** Un nom tel qu'on peut l'écrire en tête d'un tour : sans deux-points ni retour à la ligne, qui le couperaient. */
export const nomPropre = (nom: string) => nom.replace(/[:\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);

/** Un tour de parole à la suite : dans le dernier si la même personne parle encore, sinon dans un nouveau paragraphe. */
export function ajouterUnTour(dialogue: string, nom: string, texte: string): string {
  const propre = texte.trim();
  if (!propre) return dialogue;
  const base = dialogue.trimEnd();
  const dernier = base.split(/\n{2,}/).pop() ?? "";
  if (nom && dernier.startsWith(`${nom} : `)) return `${base} ${propre}`;
  const tour = nom ? `${nom} : ${propre}` : propre;
  return base ? `${base}\n\n${tour}` : tour;
}

export interface Tour { nom: string; texte: string }

/**
 * La conversation, tour par tour. Un paragraphe qui commence par « Nom : »
 * est un tour de ce nom si ce nom en ouvre au moins deux, ou s'il est une
 * voix pas encore renommée (« Personne 2 ») : une phrase comme « Il a dit :
 * oui » ne devient pas un personnage.
 */
export function lireLeDialogue(dialogue: string): Tour[] {
  const paragraphes = dialogue.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const tetes = paragraphes.map((p) => TETE.exec(p));
  const combien = new Map<string, number>();
  for (const m of tetes) if (m) combien.set(m[1].trim(), (combien.get(m[1].trim()) ?? 0) + 1);
  return paragraphes.map((p, i) => {
    const m = tetes[i];
    const nom = m?.[1].trim() ?? "";
    return m && (PERSONNE.test(nom) || (combien.get(nom) ?? 0) >= 2) ? { nom, texte: m[2].trim() } : { nom: "", texte: p };
  });
}

/** Renomme une personne : son nom change en tête de chacun de ses tours, et nulle part ailleurs. */
export function renommer(dialogue: string, ancien: string, nouveau: string): string {
  const n = nomPropre(nouveau);
  if (!n || n === ancien) return dialogue;
  const echappe = ancien.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return dialogue.replace(new RegExp(`(^|\\n\\n)${echappe} : `, "g"), `$1${n} : `);
}

/** Le nombre de mots d'un texte. */
export const nombreDeMots = (texte: string) => texte.trim().split(/\s+/).filter(Boolean).length;

/**
 * Les mots déjà écrits à l'instant mais pas encore posés dans une bulle :
 * ceux de l'écoute instantanée au-delà des `motsPoses` que la reconnaissance
 * des voix a rendus. Les deux écoutes entendent la même voix : on compte les
 * mots (« ça écrit, puis quand ça identifie la personne ça met la bulle »,
 * 2026-11-02).
 */
export function enAttenteDeVoix(instantane: string, motsPoses: number): string {
  return instantane.trim().split(/\s+/).filter(Boolean).slice(motsPoses).join(" ");
}
