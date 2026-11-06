// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Les images de l'assistant ──────────────────────────────────────────────
//
// Demande de l'enseignant (2026-11-01) : « dans l'IA, je veux pouvoir mettre
// des images avec le ⌘V » — la capture d'une séance, pour qu'elle rédige le
// questionnaire qui va avec. L'image se colle dans la zone de saisie, part
// avec le message, et reste dans la conversation.
//
// Chaque demande renvoie toute la conversation à Mistral : avec elle, les
// images les plus récentes seulement, IMAGES_PAR_DEMANDE au plus ; les plus
// anciennes restent affichées, sans repartir.

/** Les images d'un message, au plus ; et celles qui repartent avec une demande. */
export const IMAGES_PAR_DEMANDE = 8;

/** Les images que la demande emporte, message par message : les plus récentes, `max` au plus. */
export function imagesDeLaDemande(messages: { images?: string[] }[], max = IMAGES_PAR_DEMANDE): string[][] {
  const sortie: string[][] = messages.map(() => []);
  let reste = max;
  for (let i = messages.length - 1; i >= 0 && reste > 0; i--) {
    const images = messages[i].images ?? [];
    sortie[i] = images.slice(Math.max(0, images.length - reste));
    reste -= sortie[i].length;
  }
  return sortie;
}

/** Le titre d'une conversation qui commence par une image seule. */
export const TITRE_D_UNE_IMAGE = "🖼 Image";
