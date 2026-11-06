// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// Les listes du GEVA-Sco (représentants légaux, parcours, participants) se
// remplissent ligne par ligne, dans le désordre : écrire la troisième ligne
// d'une liste qui n'en a qu'une laissait des trous, que la base relit en
// `null`, et l'impression s'arrêtait sur le premier (`r.nom` d'une ligne
// absente) sans rien dire.

/** La liste sans trous, d'au moins `longueur` lignes : une ligne absente devient une ligne vide. */
export function sansTrous<T>(liste: readonly (T | null | undefined)[] | null | undefined, vide: () => T, longueur = 0): T[] {
  const n = Math.max(liste?.length ?? 0, longueur);
  return Array.from({ length: n }, (_, k) => liste?.[k] ?? vide());
}
