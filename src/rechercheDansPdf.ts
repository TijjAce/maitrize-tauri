// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Chercher dans un PDF, comme ⌘F dans un navigateur ─────────────────────
//
// Le coffre-fort affichait ses documents dans un cadre du système : pas de
// recherche, et un programme de cent pages se parcourt à la molette. pdf.js
// donne le texte de chaque page ; il reste à le comparer comme un lecteur le
// ferait, et à savoir quel morceau de la page surligner.
//
// Deux difficultés, propres aux PDF :
//   — le texte arrive en morceaux, découpés par le style et non par les mots :
//     « voca | bulaire », parfois sans l'espace entre deux mots ;
//   — les accents et la casse ne doivent pas compter, mais chaque caractère
//     comparé doit rester rattaché à son morceau pour qu'on puisse le montrer.

/** Une trouvaille dans le texte aplati d'une page. */
export interface Occurrence { debut: number; fin: number }

/** Le texte d'une page, aplati, et l'origine de chacun de ses caractères. */
export interface TexteAplati {
  texte: string;
  /** Pour chaque caractère du texte aplati, l'indice du morceau d'où il vient. */
  origine: number[];
}

/**
 * Un caractère prêt à comparer : sans accent, sans casse, apostrophe unifiée.
 *
 * Rend une chaîne et non un caractère : « Œ » en vaut deux, un accent isolé
 * n'en vaut aucun. C'est ce qui permet de suivre l'origine caractère par
 * caractère.
 */
export function aplatirCaractere(c: string): string {
  if (c === "’" || c === "'" || c === "`") return "'";
  if (c === "œ" || c === "Œ") return "oe";
  if (c === "æ" || c === "Æ") return "ae";
  // La décomposition sépare la lettre de son accent ; on jette l'accent.
  const sans = c.normalize("NFD").replace(/\p{M}/gu, "");
  return sans.toLowerCase();
}

/**
 * Aplatit les morceaux d'une page en un seul texte comparable.
 *
 * Les blancs — espaces, retours à la ligne, insécables — se réduisent à un
 * seul espace, et les blancs de tête et de queue disparaissent : le même
 * document lu par le texte brut ou par les morceaux affichés donne alors la
 * même chaîne, et les deux comptes concordent.
 */
export function aplatir(morceaux: string[]): TexteAplati {
  let texte = "";
  const origine: number[] = [];
  let blanc = true; // vrai tant qu'on n'a rien écrit : mange les blancs de tête
  for (let i = 0; i < morceaux.length; i++) {
    for (const c of morceaux[i] ?? "") {
      if (/\s/.test(c)) {
        if (!blanc) { texte += " "; origine.push(i); blanc = true; }
        continue;
      }
      const plat = aplatirCaractere(c);
      // Une origine par unité du texte : un caractère hors du plan de base — un 𝑥 de formule, un emoji — en prend deux.
      for (const p of plat) { texte += p; for (let u = 0; u < p.length; u++) origine.push(i); }
      if (plat) blanc = false;
    }
  }
  // Un blanc de queue ne se compare à rien.
  if (texte.endsWith(" ")) { texte = texte.slice(0, -1); origine.pop(); }
  return { texte, origine };
}

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Le motif d'une recherche, ou null si elle est vide.
 *
 * Entre deux mots, l'espace est facultatif : le texte d'un PDF le perd une
 * fois sur deux, et « jeux de construction » doit se trouver quand même.
 */
export function motifDe(recherche: string): RegExp | null {
  const mots = aplatir([recherche]).texte.split(" ").filter(Boolean);
  if (!mots.length) return null;
  return new RegExp(mots.map(echapper).join("\\s*"), "g");
}

/** Toutes les trouvailles d'une recherche dans un texte aplati, dans l'ordre. */
export function occurrences(texte: string, recherche: string): Occurrence[] {
  const motif = motifDe(recherche);
  if (!motif) return [];
  const sortie: Occurrence[] = [];
  for (const m of texte.matchAll(motif)) {
    if (!m[0]) continue; // un motif vide boucle sans fin
    sortie.push({ debut: m.index ?? 0, fin: (m.index ?? 0) + m[0].length });
  }
  return sortie;
}

/** Les morceaux qu'une trouvaille recouvre : ce sont eux qu'on surligne. */
export function morceauxCouverts(o: Occurrence, origine: number[]): number[] {
  const vus = new Set<number>();
  for (let i = o.debut; i < o.fin && i < origine.length; i++) vus.add(origine[i]);
  return [...vus].sort((a, b) => a - b);
}


// ── Le texte d'une page, tel qu'on le lit ─────────────────────────────────

/** Un morceau de texte posé sur la page, tel que pdf.js le donne : son texte, sa position, sa largeur, sa taille. */
export interface MorceauPose { str: string; transform: number[]; width: number; height: number; hasEOL?: boolean }

/**
 * Le texte suivi d'une page : ses morceaux recollés comme on les lit. pdf.js
 * coupe parfois un mot en plusieurs morceaux, selon l'espacement des lettres
 * (« peu | ven | t ») : les séparer chacun d'un espace donnait « peu ven t
 * dater ». Un espace ne sépare ici que deux morceaux assez éloignés sur la
 * même ligne — plus d'un cinquième de la taille des lettres —, un retour à
 * la ligne deux morceaux de lignes différentes.
 */
export function texteSuivi(morceaux: readonly MorceauPose[]): string {
  let texte = "";
  let avant: { fin: number; y: number; taille: number } | null = null;
  for (const m of morceaux) {
    const x = Number(m.transform?.[4]) || 0;
    const y = Number(m.transform?.[5]) || 0;
    const taille = Math.abs(Number(m.transform?.[3])) || m.height || 10;
    if (avant && m.str) {
      const blanc = /\s$/.test(texte) || /^\s/.test(m.str);
      if (Math.abs(y - avant.y) > Math.max(taille, avant.taille) * 0.5) { if (!blanc) texte += "\n"; }
      else if (x - avant.fin > Math.min(taille, avant.taille) * 0.2 && !blanc) texte += " ";
    }
    texte += m.str;
    if (m.hasEOL) texte += "\n";
    if (m.str) avant = { fin: x + (Number(m.width) || 0), y, taille };
  }
  return texte;
}
