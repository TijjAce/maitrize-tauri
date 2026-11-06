// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Chercher un picto, sur l'appareil ─────────────────────────────────────
//
// L'index des mots d'ARASAAC est embarqué (outils/index-arasaac.py) : la
// recherche marche sans internet et sans attendre, même quand le service
// d'ARASAAC est en panne. Seule l'image choisie se télécharge, une fois.
//
// Le mot exact d'abord, puis les mots qui commencent par ce qu'on tape, puis
// ceux qui le contiennent ; à égalité, le mot le plus court. Ni les accents ni
// les majuscules ne comptent.

/** [identifiant, « mot|autre mot|pluriel », nature] */
export type EntreeIndex = [number, string, number];

/** La couleur d'une nature d'ARASAAC, parmi celles du classeur (modele.ts) : un nom, un verbe… */
export const COULEUR_DE_LA_NATURE: Record<number, string> = { 1: "personne", 2: "nom", 3: "verbe", 4: "adjectif", 5: "social", 6: "petit mot" };

export const plier = (s: string): string =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

export interface PictoIndexe { id: number; mot: string; nature: number }

/** Les pictos d'un mot, quarante au plus, les meilleurs d'abord. */
export function chercherDans(index: EntreeIndex[], requete: string, maximum = 40): PictoIndexe[] {
  const q = plier(requete);
  if (!q) return [];
  const notes: { p: PictoIndexe; note: number; longueur: number }[] = [];
  for (const [id, mots, nature] of index) {
    let meilleure = 0, retenu = "", longueur = Infinity;
    for (const mot of mots.split("|")) {
      const m = plier(mot);
      const note = m === q ? 100
        : m.startsWith(q) ? 70
        : m.split(/[ '-]/).includes(q) ? 60
        : m.split(/[ '-]/).some((x) => x.startsWith(q)) ? 45
        : q.length >= 3 && m.includes(q) ? 20 : 0;
      if (note > meilleure || (note === meilleure && note > 0 && m.length < longueur)) { meilleure = note; retenu = mot; longueur = m.length; }
    }
    if (meilleure) notes.push({ p: { id, mot: retenu, nature }, note: meilleure, longueur });
  }
  return notes
    .sort((a, b) => b.note - a.note || a.longueur - b.longueur || a.p.id - b.p.id)
    .slice(0, maximum)
    .map((x) => x.p);
}

let charge: Promise<EntreeIndex[]> | null = null;

/** L'index, chargé à la première recherche. */
export function indexArasaac(): Promise<EntreeIndex[]> {
  charge ??= import("./donnees/arasaac-fr.json").then((m) => m.default as unknown as EntreeIndex[]);
  return charge;
}
